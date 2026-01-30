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

### Word Interpolation (Punctuation Weighting)

When splitting a sentence into word-level subtitles:

- **Base Weight**: Length of the word.
- **Punctuation Bonus**:
  - Comma/Period (`,`, `.`): +3 weight units (Strong pause).
  - Colon/Hyphen (`:`, `-`): +2 weight units (Medium pause).
- **Result**: Words followed by punctuation remain on screen longer, mimicking natural speech patterns.

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

### Remote Resource Handling

- If `avatarPath` is a URL (starts with `http`), it is automatically downloaded to a temporary file using Node's `https` module.
- The temporary file is cleaned up after video generation.

## 5. Operation Modes (Updated in v5)

The application now supports two distinct operation modes, selectable via tabs in the UI.

### 5.1. AI Mode (Automatic)

- **Input**: User provides a "Theme" or "Topic".
- **Process**:
  1.  **Gemini AI**: Generates a script and image prompts based on the theme.
  2.  **Edge-TTS**: Generates audio and word-level timings.
  3.  **Placeholder Generation**: Creates BMP images with text overlays for each scene.
  4.  **Assembly**: Concatenates images, adds audio, subtitles, and avatar.
- **Features**:
  - **Random Topic**: A "Dice" button populates the theme with a random interesting topic.
  - **Mock Mode**: Bypasses AI calls for testing (uses hardcoded data).

### 5.2. Manual Mode

- **Input**:
  - **Script**: User pastes the full text to be narrated.
  - **Images**: User selects local image files (PNG, JPG, BMP).
- **Process**:
  1.  **Bypass AI**: Skips Gemini script/image generation.
  2.  **Image Sanitization (Critical)**:
      - All user-selected images are **automatically converted to BMP** format (`-pix_fmt bgr24`) using FFmpeg.
      - This prevents "Invalid PNG signature" errors and ensures compatibility with the video generation pipeline.
  3.  **Resource Copy**: Converted images are saved to the project directory.
  4.  **Edge-TTS**: Generates audio from the _provided script_.
  5.  **Assembly**: Uses the converted images and generated audio to build the video.
- **UI Features**:
  - **Cumulative Selection**: New images are appended to the existing list, allowing selection from multiple folders.
  - **Preview**: The first selected image is displayed as the background in the Preview Panel.
  - **Deletion**: Individual images can be removed via a visible "X" button.
  - **Smart Inputs**: The "Test Text" input is hidden in Manual Mode; the preview automatically uses the user's script.

### 5.3. Default Configuration (New in v5)

- **Avatar Defaults**:
  - **Shape**: Square (previously Circle).
  - **Size**: 100% (previously 20%).
  - **Reasoning**: Optimized for full-body avatars or overlays that require maximum visibility.

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
