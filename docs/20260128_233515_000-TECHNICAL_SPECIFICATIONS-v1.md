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

## 4. Troubleshooting Checklist

If subtitles fail to appear:

1.  **Check Video FPS**: Run `ffprobe` on the input video. If `avg_frame_rate` is low (< 10), the base video generation is broken (missing `-r 30`).
2.  **Check SRT Encoding**: Ensure the SRT file does not have a BOM. (Notepad++ -> Encoding -> UTF-8).
3.  **Check Paths**: Verify the log shows mixed path styles (Backslash for IO, Forward+Escaped for Filter).
4.  **Manual Test**: Isolate the issue by running the FFmpeg command manually in a test folder with known-good assets.

## 5. Code Architecture (Modularization)

To maintain scalability, the video generation logic is split into specialized utility modules. `videoService.ts` acts solely as an orchestrator.

### Utility Modules (`src/main/utils/`)

- `audioUtils.ts`: Handles audio downloading (`yt-dlp`), duration extraction (`ffprobe`), and trimming.
- `subtitleParser.ts`: Contains the core SRT parsing and synchronization logic (Strict Start, Smart Extension).
- `ttsUtils.ts`: Manages Text-to-Speech generation via `edge-tts`.
- `imageUtils.ts`: Generates placeholder images (BMP) for testing.
- `ffmpegUtils.ts`: Centralizes FFmpeg path configuration and process management (killing zombie processes).
- `avatarUtils.ts`: Handles avatar overlay, scaling, and chroma keying.

### Service Layer

- `videoService.ts`: Coordinates the pipeline:
  - `createVideo`: Generates base video from images + audio.
  - `addAvatarOverlay`: Applies avatar (if configured).
  - `addSubtitlesToVideo`: Burns subtitles (if configured).
