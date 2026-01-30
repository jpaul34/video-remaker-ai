# Technical Specifications: Video Generation & Subtitles (v11)

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

## 2. Subtitle Positioning & Alignment (CRITICAL)

The application supports 9 screen positions. FFmpeg's internal SRT-to-ASS conversion uses the **SSA v4 Alignment standard**, which differs from the modern ASS mapping.

- **Alignment Mapping (SSA v4)**:
  - **Bottom**: `Left (1)`, `Center (2)`, `Right (3)`
  - **Top**: `Left (5)`, `Center (6)`, `Right (7)`
  - **Middle**: `Left (9)`, `Center (10)`, `Right (11)`
- **Discrepancy Warning**: **Do not use values 4 or 8**; these are often ignored or incorrectly mapped by the internal filters, leading to "Top Left" resets.
- **Implementation**: The mapping function `getAlignment` in `subtitleService.ts` must maintain this specific SSA v4 table.

## 3. Punctuation & Script Fidelity

TTS engines (like `edge-tts`) often strip opening punctuation (`¿`, `¡`) or split punctuation into separate timed segments.

- **Orphan Merging**: Isolated punctuation segments (e.g., `,`, `.`, `!`, `?`) in the SRT must be merged with the preceding word's segment in `subtitleParser.ts`.
- **Script Re-injection**: Timed words from the TTS must be aligned with the original script words. Missing opening marks (`¿`, `¡`) and ellipses (`…`) are re-injected from the script.

## 4. Frontend-Main Consistency

- **Margins**: Consistent vertical margins (5% of height) are maintained using `5cqh` in CSS and `Math.round(assReferenceHeight * 0.05)` in FFmpeg.
- **Preview Scaling**: The `PreviewPanel` container is fixed at `800x600px`. All absolute pixel calculations in the preview must be relative to this container to remain "WYSIWYG".

## 5. Lessons Learned & Best Practices

### ✅ Qué Hacer (Do's)

- **Alinear con el Guion**: Siempre usa el guion original como fuente de verdad para el texto. La IA solo provee los tiempos.
- **Validar el Estándar de Align**: FFmpeg es "caprichoso" con los códigos de alineación. Usa siempre el mapa de **SSA v4 (1, 2, 3, 5, 6, 7, 9, 10, 11)** para subtítulos quemados (hardcoded).
- **Usar Altura de Referencia**: Sincroniza todo basándote en la altura del video (1080px o 1920px) para mantener la escala proporcional.

### ❌ Qué NO Hacer (Don'ts)

- **No uses Alignment 5 para el Centro**: En el estándar ASS moderno 5 es centro, pero en FFmpeg interno a veces se interpreta como "Top Left". **Usa 10 para Centro**.
- **No asumas que la IA lee todo**: `edge-tts` ignora los signos `¿` y `¡`. Si no los re-inyectas manualmente, el usuario verá subtítulos gramaticalmente incorrectos.
- **No uses porcentajes en FFmpeg**: Usa valores absolutos calculados (`fontSize`, `MarginV`) basados en el `PlayResY` de referencia (288).

---

_Last Updated: 2026-01-29 - Version 11_
