# Technical Specifications: Video Generation & Subtitles (v9)

This document establishes the critical configurations required for the `video-remaker-ai` application to function correctly on Windows. **Do not deviate from these specifications without rigorous manual testing.**

## 1. Subtitle Font Size Synchronization (WYSIWYG)

To ensure the preview panel accurately reflects the final video output, font sizes are defined in pixels relative to a **1080p (1080px height)** reference.

- **Default Font Size**: `48px` (relative to 1080p).
- **Implementation (Renderer)**:
  - The preview uses `cqh` (Container Query Height) units.
  - Formula: `fontSize: `${(fontSize / 1080) \* 100}cqh``in`PreviewPanel.tsx`.
- **Implementation (Main)**:
  - FFmpeg's `libass` uses a default `PlayResY` of 288 for SRT-to-ASS conversion.
  - Formula: `const fontSize = Math.round(style.size * (288 / 1080))` in `subtitleService.ts`.
- **MarginV**: Fixed at 5% of height (`5cqh` in preview, `Math.round(288 * 0.05)` in FFmpeg).

## 2. Preview Panel Stability & Aspect Ratio

The preview panel must remain stable and correctly contain any aspect ratio (16:9, 9:16, 1:1, 3:4).

- **Container**: Fixed size of `800x600px` with `bg-black` and `mx-auto`.
- **Containment Logic**:
  - Dynamically set `width` and `height` based on whether the video is "wider" or "taller" than the 800/600 ratio.
  - Wider (e.g., 16:9): `width: 100%`, `height: auto`.
  - Taller (e.g., 9:16): `width: auto`, `height: 100%`.
  - This ensures perfect letterboxing/pillarboxing without collapsing the container.

## 3. edge-tts Robustness (Voice Generation)

To handle common network timeouts with Microsoft's TTS servers:

- **Retry Mechanism**: Implemented in `ttsUtils.ts`.
- **Attempts**: Up to 3 attempts with exponential backoff (2s, 4s delay).
- **Logging**: Each attempt and its result are logged to the console/logger.

## 4. FFmpeg Command Structure (Windows)

### 4.1. Path Handling

- **Input/Output Paths**: MUST use standard Windows backslashes (`\`).
- **Filter Paths**: Inside the `subtitles=filename='...'` filter, paths MUST use forward slashes (`/`) and the drive colon MUST be escaped (`\:`).
  - _Correct_: `C\:/path/to/subtitles.srt`

### 4.2. Subtitle Filter (`force_style`)

- **FontName**: MUST be explicitly set to `Arial`.
- **Alignment**: `2` (Bottom Center).
- **Colors**: Use `&HBBGGRR` format.

## 5. Video Generation (Base Video)

- **Resolution**: Standardized to 1080p base (e.g., 1920x1080 for 16:9, 1080x1920 for 9:16).
- **Constant Frame Rate (CFR)**: MUST use `fps=fps=30` filter AND `-r 30` output flag.
- **Codec**: `libx264` with `pix_fmt yuv420p`.

---

_Last Updated: 2026-01-29_
