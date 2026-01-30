# Technical Specifications: Video Generation & Subtitles (v8)

This document establishes the critical configurations required for the `video-remaker-ai` application to function correctly on Windows. **Do not deviate from these specifications without rigorous manual testing.**

## 1. Subtitle Font Size Synchronization (WYSIWYG)

To ensure the preview panel accurately reflects the final video output, the font size multipliers MUST be synchronized.

- **Multiplier**: `4%` (0.04) of the video/container width.
- **Implementation (Renderer)**: `fontSize: `${4 \* (fontSize / 100)}cqw``in`PreviewPanel.tsx`.
- **Implementation (Main)**: `const baseFontSize = Math.round(width * 0.04 * (style.size / 100))` in `subtitleService.ts`.
- **Minimum Size**: `24px` (hardcoded in `subtitleService.ts`) to ensure readability on small screens.

> [!IMPORTANT]
> **What NOT to do**: Do not use different multipliers for preview and generation. If the preview uses 6% and the generation uses 4%, the user will not be able to adjust the text size correctly.

## 2. FFmpeg Command Structure (Windows)

### 2.1. Path Handling

- **Input/Output Paths**: MUST use standard Windows backslashes (`\`).
- **Filter Paths**: Inside the `subtitles=filename='...'` filter, paths MUST use forward slashes (`/`) and the drive colon MUST be escaped (`\:`).
  - _Correct_: `C\:/path/to/subtitles.srt`

### 2.2. Subtitle Filter (`force_style`)

- **FontName**: MUST be explicitly set to `Arial` (or another standard system font).
- **Alignment**: `2` (Bottom Center).
- **MarginV**: ~7% of video height.
- **Colors**: Use `&HBBGGRR` format.

## 3. SRT File Generation

- **Encoding**: UTF-8 without BOM (Byte Order Mark).
- **Line Endings**: CRLF (`\r\n`).
- **Timing**: `HH:MM:SS,mmm`.

## 4. Video Generation (Base Video)

- **Constant Frame Rate (CFR)**: MUST use `fps=fps=30` filter AND `-r 30` output flag.
- **Codec**: `libx264` with `pix_fmt yuv420p`.

## 5. Troubleshooting: edge-tts (TTS Generation)

If video generation fails during the "Generando voz" step with an `asyncio.exceptions.CancelledError` or `aiohttp` connection error:

- **Cause**: This is a network-level issue between the local Python process and Microsoft's TTS servers.
- **Diagnosis**: Run `python -m edge_tts --text "test" --write-media test.mp3` in the terminal. If it works there but fails in the app, it's likely a temporary timeout or firewall issue.
- **Resolution**:
  1. Check internet connectivity.
  2. Retry the generation (the service is usually restored quickly).
  3. Ensure `aiohttp` and `edge-tts` are up to date in the Python environment.

## 6. Avatar Implementation

- **Scaling**: `scale=-1:H*size` (size as decimal, e.g., 0.3).
- **Chroma Key**: Applied BEFORE scaling.
- **Audio**: Use `-map 0:a` to preserve base video narration.

---

_Last Updated: 2026-01-29_
