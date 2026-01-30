# Technical Specifications: Video Generation & Subtitles (v10)

This document establishes the critical configurations required for the `video-remaker-ai` application to function correctly on Windows. **Do not deviate from these specifications without rigorous manual testing.**

## 1. Subtitle Font Size Synchronization (WYSIWYG)

To ensure the preview panel accurately reflects the final video output, font sizes are defined via presets calibrated to a **1080p (1080px height)** reference.

- **Presets**:
  - `XS`: 32px, `SM`: 48px, `MD`: 64px, `LG`: 80px, `XL`: 100px, `2XL`: 120px.
- **Implementation (Renderer)**:
  - Uses `cqh` (Container Query Height) units in `PreviewPanel.tsx`.
  - Formula: `fontSize: `${(fontSize / virtualHeight) \* 100}cqh``.
- **Implementation (Main)**:
  - FFmpeg's `libass` uses a default `PlayResY` of 288 for SRT-to-ASS conversion.
  - Formula: `const fontSize = (style.size * (288 / height)).toFixed(2)` in `subtitleService.ts`.
- **Precision**: Decimal font sizes are enabled in FFmpeg `force_style` to allow sub-pixel visual matching.

## 2. Punctuation & Script Fidelity

TTS engines (like `edge-tts`) often strip opening punctuation (`¿`, `¡`) or split punctuation into separate timed segments. To maintain 100% fidelity to the original script:

- **Orphan Merging**: Isolated punctuation segments (e.g., `,`, `.`, `!`, `?`) in the SRT must be merged with the preceding word's segment in `subtitleParser.ts`.
- **Script Re-injection**: Timed words from the TTS must be aligned with the original script words. Missing opening marks (`¿`, `¡`) and ellipses (`…`) are re-injected from the script.
- **Comparison Logic**: Use "clean" versions of words (lowercase, alphanumeric only) for alignment to handle potential splitting differences.

## 3. Preview Panel Stability & Aspect Ratio

- **Container**: Fixed size of `800x600px` with `bg-black`.
- **Containment Logic**:
  - Wider (e.g., 16:9): `width: 100%`, `height: auto` inside the centered flex container.
  - Taller (e.g., 9:16): `width: auto`, `height: 100%`.
  - This ensures perfect letterboxing/pillarboxing for any format (16:9, 9:16, 1:1, 3:4).

## 4. Avatar Scaling Synchronization

- **Preview**: Removes `object-contain` and uses exact pixel-to-container ratios.
- **Main**: FFmpeg `overlay` filter uses proportional scaling relative to video height.
- **Consistency**: The avatar's visual footprint in the preview must match its footprint in the 1080p generated video exactly.

## 5. edge-tts Robustness

- **Retry Mechanism**: Mandatory 3-attempt retry with exponential backoff (2s, 4s) to handle network timeouts.

## 6. Lessons Learned & Best Practices

### ✅ Qué Hacer (Do's)

- **Alinear con el Guion**: Siempre usa el guion original como fuente de verdad para el texto de los subtítulos, usando los tiempos de la IA solo para la sincronización.
- **Usar Altura de Referencia**: Sincroniza todos los elementos visuales basándote en la altura del video (1080px) para mantener la consistencia en diferentes resoluciones.
- **Validar con Scripts de Prueba**: Crea scripts cortos en Python/JS para verificar la salida de componentes externos (como `edge-tts` o FFmpeg) antes de integrarlos.

### ❌ Qué NO Hacer (Don'ts)

- **No asumas fidelidad 1:1 de la IA**: Las herramientas de TTS y transcripción suelen normalizar el texto. Nunca confíes ciegamente en el texto que devuelven para los subtítulos.
- **Evita porcentajes flotantes**: El uso de estilos basados en porcentajes variables en el frontend suele causar discrepancias con el renderizado absoluto de FFmpeg. Usa referencias de píxeles fijos (basados en 1080p).
- **No ignores los "huérfanos"**: Si separas por espacios, la puntuación puede quedar sola. Asegúrate de que los signos de puntuación siempre "viajen" pegados a la palabra anterior.

---

_Last Updated: 2026-01-29 - Version 10_
