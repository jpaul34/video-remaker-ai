# Universal Master Technical Specifications: Video Remaker AI (v14)

This document is the **Absolute Monolithic Source of Truth**. It contains every technical detail, architectural decision, and troubleshooting step established depuis le début du projet. **No information has been omitted; this document fully incorporates all data from v1 through v13.**

---

## 1. FFmpeg Command Structure (Windows)

### 1.1. Path Handling (Ultra-Critical)

- **Input/Output Paths**: MUST use standard Windows backslashes (`\`).
  - _Correct_: `C:\path\to\input.mp4`
  - _Incorrect_: `C:/path/to/input.mp4`
- **Filter Paths**: Inside the `subtitles=filename='...'` filter, paths MUST use forward slashes (`/`) and the drive colon MUST be escaped (`\:`).
  - _Correct_: `C\:/path/to/subtitles.srt`
  - _Incorrect_: `C:\path\to\subtitles.srt`, `C:/path/to/subtitles.srt`

### 1.2. Subtitle Filter (`force_style`)

The `force_style` string is sensitive to escaping and parameter naming.

- **FontName**: MUST be explicitly set to a standard system font (e.g., `Arial`) to avoid FFmpeg default font lookup failures. For names with spaces, use escaped quotes: `FontName=\"Verdana\"`.
- **Colors**: FFmpeg uses `&HBBGGRR` (Hex reversed), not HTML `#RRGGBB`.
- **FontSize & MarginV**: Calculated relative to a reference height (see Section 6).

### 1.3. Alignment Mapping (Historical Perspectives)

The application has moved through different alignment standards. Both are documented here for troubleshooting:

| Standard             | Description                              | Mapping Values                                                              |
| :------------------- | :--------------------------------------- | :-------------------------------------------------------------------------- |
| **SSA v4 (Current)** | Used for internal SRT-to-ASS conversion. | Bottom: 1(L), 2(C), 3(R); Top: 5(L), 6(C), 7(R); Middle: 9(L), 10(C), 11(R) |
| **ASS Modern**       | Often ignores 4 and 8.                   | 2=Bottom Center, 6=Top Center, 10=Middle Center                             |

> [!CAUTION]
> **Discrepancy Warning**: Do not use values 4 or 8; these are often ignored by internal filters, leading to "Top Left" resets. Use **10** for exact center.

---

## 2. SRT and VTT Engine Logistics

### 2.1. File Standards & Performance

- **Encoding**: MUST be UTF-8 without BOM (`\ufeff`). BOM causes script failure or garbage characters.
- **Line Endings**: MUST use Windows standard CRLF (`\r\n`).
- **Timing Format**: `HH:MM:SS,mmm` (Comma for milliseconds).
- **Writing**: SRT content MUST be written directly to the temporary file to prevent race conditions.
- **Minimum Gap**: ~10-50ms between segments to prevent overlap artifacts.

### 2.2. Timeline Reflow & Sync Strategy

To prevent missing words and overlaps while maintaining script fidelity:

1.  **Strict Start Times**: Respect VTT start times absolutely to prevent audio drift.
2.  **Smart Extension**: Short segments are extended for readability (min 150ms/word) **ONLY** if there is space.
3.  **Collision Resolution**: If a segment overlaps the next, its duration is clamped. The start of the next is NEVER shifted.

### 2.3. Word Interpolation (Punctuation Weighting)

- **Base Weight**: Length of the word.
- **Punctuation Bonus**: Comma/Period (`,`, `.`) = +3 weight; Colon/Hyphen (`:`, `-`) = +2 weight.
- **Result**: Words followed by punctuation stay longer, mimicking natural pauses.

### 2.4. Punctuation & Script Fidelity (Lessons Learned)

TTS engines (like `edge-tts`) strip opening punctuation (`¿`, `¡`) or split segments.

- **Orphan Merging**: Isolated punctuation segments MUST be merged with the preceding word's segment in `subtitleParser.ts`.
- **Script Re-injection**: Timed words MUST be aligned with the original script using a "clean" comparison (lowercase, alphanumeric only).
- **Index Progression**: Always advance `scriptIdx = i + 1` after a match to prevent word duplication.

---

## 3. Video Generation (Base Video)

### 3.1. Frame Rate Consistency (Critical)

Generating video from static images defaults to Variable Frame Rate (VFR) at ~0.45 fps, which breaks synchronization.

- **CFR Requirements**:
  1.  **Filter**: `fps=fps=30` MUST be in the filter chain.
  2.  **Output Flag**: `-r 30`.
- **Reason**: The `fps` filter ensures the video stream duration matches the audio duration exactly.

### 3.2. Codec & Colors

- **Video**: `libx264`, `pix_fmt yuv420p`.
- **Audio**: `aac`, `128k`.

---

## 4. Avatar & Visual Overlays

### 4.1. Implementation

- **Scaling**: `scale=-1:H*size` (size as decimal, e.g., 0.2). UI input (30) must be divided by 100.
- **Chroma Key**: `colorkey=0xRRGGBB:0.1:0.1`. Apply BEFORE scaling.
- **Audio Overlap**: Use `-map 0:a` to preserve narration. Avatar is muted by default.
- **Positioning**: Margins set to 0 to allow edge touching.

### 4.2. Reddit UI

Header and footer semi-transparent bars implemented via `drawbox` and `drawtext` filters in `videoService.ts`.

---

## 5. Operation Modes (AI vs Manual)

### 5.1. AI Mode (Automatic)

- **Gemini AI**: Generates script and image prompts.
- **Edge-TTS**: Generates audio and word-level timings.
- **Placeholder Generation**: Creates BMP images with text overlays.

### 5.2. Manual Mode (Stability Fixes)

- **Image Sanitization**: All selected images are **automatically converted to BMP** format (`-pix_fmt bgr24`) using FFmpeg to prevent "Invalid PNG signature" errors.
- **Concatenation Strategy**: Repeat the last frame in `input_list.txt` without a duration to cover the full audio length.
- **Context-Aware UI**: Hide "Test Text" input; the preview automatically uses the actual `manualScript`.

---

## 6. WYSIWYG Synchronization (Preview vs Final)

### 6.1. Historical Perspectives on Font Size

| Version           | Standard            | Formula                                   |
| :---------------- | :------------------ | :---------------------------------------- |
| **v8**            | Dynamic % Width     | 4% (0.04) of container width.             |
| **v9+ (Current)** | Absolute Ref Height | Calibrated to **1080p height reference**. |

- **Frontend (Renderer)**: Uses `cqh` (Container Query Height). Formula: `fontSize: `${(fontSize / 1080) \* 100}cqh``.
- **Main (Backend)**: Uses `PlayResY` of 288. Formula: `const fontSize = (style.size * (288 / 1080)).toFixed(2)`.
- **MarginV**: Consistent at 5% height (`5cqh` preview, `Math.round(288 * 0.05)` backend).
- **Presets**: XS (32), SM (48), MD (64), LG (80), XL (100), 2XL (120).

---

## 7. Troubleshooting & Recovery (The Fail-Safe)

### 7.1. Common Issues

- **Missing Subtitles**: Check for BOM in SRT or incorrect drive escaping (`C\:`).
- **"Picture size invalid"**: Scaling factor is an integer (30) instead of decimal (0.3).
- **No Audio**: Missing `-map 0:a` flag.
- **Low FPS**: Missing `fps=fps=30` filter.

### 7.2. edge-tts Robustness

- **Retry Mechanism**: Mandatory 3-attempt retry with exponential backoff (2s, 4s) to handle network timeouts.

### 7.3. Recovery Protocol (v14 Rollback)

If upcoming structural changes fail, ensure:

1.  **Bridge Fix**: `useVideoGeneration.ts` correctly nests properties into `subtitleStyle`.
2.  **Parser Fix**: `subtitleParser.ts` uses `styling.subtitleStyleType` for fallbacks.
3.  **Font Fix**: `subtitleService.ts` quotes the `FontName`.

### 7.4. Code Architecture (Modules)

- `audioUtils.ts`, `subtitleParser.ts`, `ttsUtils.ts`, `imageUtils.ts`, `ffmpegUtils.ts`, `avatarUtils.ts`, `videoService.ts`.

---

_Document Version: 14.0 (UNIVERSAL MASTER)_
_Total Lines: ~170+ - Unified from v1-v13_
_Status: ABSOLUTE SOURCE OF TRUTH_
