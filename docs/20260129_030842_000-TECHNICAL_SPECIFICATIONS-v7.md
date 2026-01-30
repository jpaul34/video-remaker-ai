# Technical Specifications: Video Generation & Subtitles (v7)

This document establishes the critical configurations required for the `video-remaker-ai` application to function correctly on Windows. **Do not deviate from these specifications without rigorous manual testing.**

## 1. FFmpeg Command Structure (Windows)

### 1.1. Path Handling

- **Input/Output Paths**: MUST use standard Windows backslashes (`\`).
  - _Correct_: `C:\path\to\input.mp4`
  - _Incorrect_: `C:/path/to/input.mp4`
- **Filter Paths**: Inside the `subtitles=filename='...'` filter, paths MUST use forward slashes (`/`) and the drive colon MUST be escaped (`\:`).
  - _Correct_: `C\:/path/to/subtitles.srt`
  - _Incorrect_: `C:\path\to\subtitles.srt`, `C:/path/to/subtitles.srt`

### 1.2. Subtitle Filter (`force_style`)

The `force_style` string is sensitive. The following parameters are validated:

- **FontName**: MUST be explicitly set to a standard system font (e.g., `Arial`) to avoid FFmpeg default font lookup failures.
- **Alignment**: `2` (Bottom Center).
- **FontSize**: Calculated dynamically (multiplier `0.04` of video width, minimum `24px`).
- **MarginV**: Calculated dynamically (~7% of video height).
- **Colors**: FFmpeg uses `&HBBGGRR` (Hex reversed), not HTML `#RRGGBB`.

**Example Valid Filter String**:

```
subtitles=filename='C\:/path/to/subs.srt':force_style='FontName=Arial,FontSize=29,PrimaryColour=&H00FFFF,Alignment=2,MarginV=90,Outline=2,Shadow=1'
```

## 2. SRT File Generation

### 2.1. Encoding and Writing

- **Encoding**: MUST be UTF-8 without BOM.
- **Critical**: The Byte Order Mark (`\ufeff`) causes FFmpeg to fail or render garbage characters.
- **Writing Strategy**: SRT content MUST be written directly to the temporary file used by FFmpeg. Avoid reading from one file and writing to another to prevent race conditions or corruption.
- **Line Endings**: MUST use Windows standard CRLF (`\r\n`).

### 2.2. Timing

- **Format**: `HH:MM:SS,mmm` (Comma for milliseconds).
- **Reflow**: Subtitles must not overlap. A minimum gap of ~10-50ms is recommended between segments.

## 3. Video Generation (Base Video)

### 3.1. Frame Rate Consistency (Critical)

- **Constant Frame Rate (CFR)**: The base video MUST be generated with a forced constant frame rate using BOTH a filter and an output option.
- **Filter**: `fps=fps=30` MUST be included in the video filter chain.
- **Output Flag**: `-r 30`.
- **Reason**: Without the `fps` filter, generating video from static images can result in a video stream with only one frame (duration ~0.033s), even if the audio is long. This causes the FFmpeg subtitle filter to terminate immediately. The `fps` filter ensures the video stream duration matches the audio duration.

### 3.2. Codec Settings

- **Video**: `libx264`, `pix_fmt yuv420p` (for broad compatibility).
- **Audio**: `aac`, `128k`.

## 4. Avatar Implementation

### 4.1. Architecture

- **Optionality**: The avatar is optional. The default `avatarUrl` MUST be an empty string.
- **Backend**: `videoService.ts` MUST only process the avatar if `avatarPath` is provided and the file exists.

### 4.2. FFmpeg Implementation Details

1.  **Scaling**: `scale=-1:H*size` (where `size` is a decimal, e.g., 0.3 for 30%).
2.  **Chroma Key**: `colorkey=0xRRGGBB:0.1:0.1` applied _before_ scaling.
3.  **Positioning**: `overlay=x=...:y=...` with 0 margins.
4.  **Audio**: `-map 0:a` MUST be used to preserve the narration from the base video.

## 5. Troubleshooting Checklist

1.  **Check Video Duration**: Run `ffprobe` on the base video. If the video stream duration is near 0 (e.g., 0.033s) while audio is long, the `fps=fps=30` filter is missing.
2.  **Check Subtitle Visibility**: If subtitles don't appear, verify the `Alignment` is `2` and `FontSize` is sufficient (min 24px).
3.  **Check SRT Corruption**: Verify the temporary SRT file contains valid timestamps and text.
