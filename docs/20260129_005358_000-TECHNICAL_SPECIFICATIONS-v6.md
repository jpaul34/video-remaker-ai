# Technical Specifications: Video Generation & Subtitles

This document establishes the critical configurations required for the `video-remaker-ai` application to function correctly on Windows. **Do not deviate from these specifications without rigorous manual testing.**

## 1. FFmpeg Command Structure (Windows)

### Path Handling

- **Input/Output Paths**: MUST use standard Windows backslashes (`\`).
  - _Correct_: `C:\path\to\input.mp4`
  - _Incorrect_: `C:/path/to/input.mp4`
- **Filter Paths**: Inside the `subtitles=filename='...'` filter, paths MUST use forward slashes (`/`) and the drive colon MUST be escaped (`\:`).
  - _Correct_: `C\:/path/to/subtitles.srt`
  - _Incorrect_: `C:\path\to\subtitles.srt`, `C:/path/to/subtitles.srt`

### Subtitle Filter (`force_style`)

The `force_style` string is sensitive. The following parameters are validated:

- **FontName**: MUST be explicitly set to a standard system font (e.g., `Arial`) to avoid FFmpeg default font lookup failures.
- **Alignment**: `6` (Top Center).
- **FontSize**: Calculated dynamically (~2% of video width).
- **MarginV**: Calculated dynamically (~7% of video height).
- **Colors**: FFmpeg uses `&HBBGGRR` (Hex reversed), not HTML `#RRGGBB`.

**Example Valid Filter String**:

```
subtitles=filename='C\:/path/to/subs.srt':force_style='FontName=Arial,FontSize=26,PrimaryColour=&H00FFFF,Alignment=6,MarginV=50,Outline=2,Shadow=1'
```

## 2. SRT File Generation

### Encoding

- **Encoding**: MUST be UTF-8 without BOM.
- **Critical**: The Byte Order Mark (`\ufeff`) causes FFmpeg to fail or render garbage characters on some Windows environments.
- **Line Endings**: MUST use Windows standard CRLF (`\r\n`).

### Timing

- **Format**: `HH:MM:SS,mmm` (Comma for milliseconds).
- **Reflow**: Subtitles must not overlap. A minimum gap of ~10-50ms is recommended between segments.

### Timeline Reflow Strategy (Critical)

To prevent missing words and overlaps while maintaining sync, the system implements a multi-pass algorithm:

1.  **Strict Start Times**: VTT start times are respected absolutely to prevent audio drift.
2.  **Smart Extension**: Short segments are extended for readability (min 150ms/word) **ONLY** if there is space before the next segment.
3.  **Collision Resolution**: If a segment overlaps the next one, its duration is clamped. The start time of the next segment is **NEVER** shifted.

## 3. Video Generation (Base Video)

### Frame Rate

- **Constant Frame Rate (CFR)**: The base video MUST be generated with a forced constant frame rate.
- **Flag**: `-r 30` (or desired FPS).
- **Reason**: Generating video from static images without this flag results in a Variable Frame Rate (VFR) with extremely low FPS (e.g., ~0.45 fps), which desynchronizes or breaks the subtitle filter.

### Codec Settings

- **Video**: `libx264`, `pix_fmt yuv420p` (for broad compatibility).
- **Audio**: `aac`, `128k`.

## 4. Avatar Implementation

### Architecture

- **Frontend**: `ConfigPanel.tsx` collects parameters (path, size, position, chroma key).
- **IPC**: Parameters are normalized (e.g., `avatarUrl` -> `avatarPath`) and sent to `main`.
- **Backend**: `videoService.ts` handles logic, `avatarUtils.ts` handles FFmpeg construction.

### FFmpeg Implementation Details

The avatar overlay uses a complex filter chain.

1.  **Scaling**:
    - The avatar is scaled relative to the video height.
    - **Formula**: `scale=-1:H*size` (where `size` is a decimal, e.g., 0.3 for 30%).
    - **Critical**: Input size from UI (e.g., 30) MUST be divided by 100 before passing to FFmpeg.

2.  **Chroma Key (Green Screen)**:
    - **Filter**: `colorkey=0xRRGGBB:0.1:0.1`
    - Applied _before_ scaling to ensure clean edges.

3.  **Positioning**:
    - **Filter**: `overlay=x=...:y=...`
    - **Margins**: Set to 0 to allow the avatar to touch the edges of the video frame.

4.  **Audio Handling**:
    - **Mapping**: `-map 0:a` MUST be used to explicitly select the audio from the base video (Input 0).
    - **Avatar Audio**: By default, the avatar's audio is NOT mapped, effectively muting it.

## 5. Manual Mode & Image Handling (New in v6)

This section details the specific strategies implemented to ensure stability in Manual Mode.

### 5.1. Image Sanitization (Critical)

User-provided images can have various formats, encodings, or corrupt headers that cause FFmpeg to fail with "Invalid PNG signature" or "Conversion failed".

- **Strategy**: Automatic Pre-conversion.
- **Implementation**: Before video generation, all manual images are converted to BMP (`-pix_fmt bgr24`) using FFmpeg.
- **Correct vs Incorrect**:
  - _Correct_: Convert `image.jpg` -> `image.bmp` using FFmpeg, then use `image.bmp` in the concat list.
  - _Incorrect_: Use `image.jpg` directly in the concat list (Risk: FFmpeg failure due to metadata/header issues).

### 5.2. Video Concatenation Logic

When creating a video from a list of images (`concat` demuxer), the last image often gets cut off or ignored if the duration logic is flawed.

- **Strategy**: Repeat Last Frame.
- **Implementation**: The `input_list.txt` generator repeats the last image entry without a duration directive to ensure the video stream covers the full audio length.
- **Correct vs Incorrect**:
  - _Correct_:
    ```
    file 'image1.bmp'
    duration 5
    file 'image2.bmp'
    duration 5
    file 'image2.bmp'  <-- Repeated last frame
    ```
  - _Incorrect_:
    ```
    file 'image1.bmp'
    duration 5
    file 'image2.bmp'
    duration 5
    ```

### 5.3. UI & Preview Logic

To prevent user confusion and ensure "What You See Is What You Get" (WYSIWYG).

- **Strategy**: Context-Aware Inputs.
- **Implementation**:
  - **Manual Mode**: Hide "Test Text" input. Use the actual `manualScript` for the subtitle preview.
  - **AI Mode**: Show "Test Text" input for quick styling checks.
- **Correct vs Incorrect**:
  - _Correct_: Preview updates dynamically as the user types in the "Script" textarea.
  - _Incorrect_: User types in "Script", but Preview shows static "Test Text" (User thinks script isn't working).

### 5.4. Default Configuration

- **Avatar Defaults**:
  - **Shape**: Square (Optimized for full-body/screen overlays).
  - **Size**: 100% (Maximizes visibility).
  - **Reasoning**: Users typically want the avatar to be a prominent overlay, not a small circle, when using this tool for presentations.

## 6. Troubleshooting Checklist

If subtitles fail to appear:

1.  **Check Video FPS**: Run `ffprobe` on the input video. If `avg_frame_rate` is low (< 10), the base video generation is broken (missing `-r 30`).
2.  **Check SRT Encoding**: Ensure the SRT file does not have a BOM. (Notepad++ -> Encoding -> UTF-8).
3.  **Check Paths**: Verify the log shows mixed path styles (Backslash for IO, Forward+Escaped for Filter).
4.  **Manual Test**: Isolate the issue by running the FFmpeg command manually in a test folder with known-good assets.

If avatar fails to appear or has issues:

1.  **"Picture size invalid" Error**: The scaling factor is likely passed as an integer (e.g., 30) instead of a decimal (0.3).
2.  **No Audio**: Ensure `-map 0:a` is present in the FFmpeg command to preserve the narration.
3.  **Avatar Not Downloading**: Check network connectivity and ensure the URL is direct to an image/video file.

If Manual Mode fails:

1.  **"Invalid PNG signature"**: This is now handled by automatic BMP conversion. If it persists, check the `imageUtils.ts` logs.
2.  **Missing Images in Video**: Ensure the `input_list.txt` generation logic repeats the last image to cover the full audio duration.

## 7. Code Architecture (Modularization)

To maintain scalability, the video generation logic is split into specialized utility modules. `videoService.ts` acts solely as an orchestrator.

### Utility Modules (`src/main/utils/`)

- `audioUtils.ts`: Handles audio downloading (`yt-dlp`), duration extraction (`ffprobe`), and trimming.
- `subtitleParser.ts`: Contains the core SRT parsing and synchronization logic (Strict Start, Smart Extension).
- `ttsUtils.ts`: Manages Text-to-Speech generation via `edge-tts`.
- `imageUtils.ts`: Generates placeholder images (BMP) and **converts manual images to BMP**.
- `ffmpegUtils.ts`: Centralizes FFmpeg path configuration and process management (killing zombie processes).
- `avatarUtils.ts`: Handles avatar overlay, scaling, and chroma keying.

### Service Layer

- `videoService.ts`: Coordinates the pipeline:
  - `createVideo`: Generates base video from images + audio.
  - `addAvatarOverlay`: Applies avatar (if configured).
  - `addSubtitlesToVideo`: Burns subtitles (if configured).
