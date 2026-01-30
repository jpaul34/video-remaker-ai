# Technical Specifications: Video Generation & Subtitles (v13)

This document establishes the critical configurations and lessons learned from the multi-line subtitle implementation. **Adherence to these rules is mandatory to avoid regressions in spacing and layout.**

## 1. Multi-line Rendering & Layout (Frontend)

To ensure subtitlers render correctly as separate rows in the preview:

- **❌ Incorrect**: Using `display: inline-block` or `flex` without explicit wraps for row containers. This causes lines to squash together or stack horizontally when the container has enough width.
- **✅ Correct**: Use `display: block` and `width: 100%` for each line wrapper. This forces a vertical stack regardless of text length.
- **Styling**: Ensure `word-break: break-word` is present to handle long individual words within a line.

## 2. Punctuation Reinjection Logic (Main Process)

Aligning TTS timed words with the original script (to restore `¿`, `¡`, `...`):

- **❌ Incorrect**: Iterating through the original script words without advancing the base index (`scriptIdx`). This leads to the same original word being matched to multiple timed words if the look-ahead finds it again, causing massive text duplication and "joined" words without spaces.
- **✅ Correct**: Always advance `scriptIdx = i + 1` as soon as a match is found for a timed word. This ensures a 1-to-1 progression and maintains script fidelity.

## 3. ASS Tag Implementation (Main/Backend)

Mapping UI styles to FFmpeg `libass` tags:

- **Font Weight**:
  - `Bold`: `\b1`
  - `Semibold`: `\b600`
  - `Normal`: `\b0`
- **Highlighting (Border vs Shadow)**:
  - **Border (Outline)**: `\bord2\shad0` (Hard outline, no shadow).
  - **Shadow**: `\bord0\shad4` (No border, soft drop shadow).
  - **None**: `\bord0\shad0`.

## 4. Resetting & Synchronization

- **State Sync**: Any change to `useGeneralStyle` must trigger a layout recalculation in the `PreviewPanel`.
- **Reset Tag**: Always terminate ASS tag blocks with `{\r}` at the end of each physical line to prevent style "bleeding" into the next row.

---

_Last Updated: 2026-01-29 - Version 13 - Focus on Spacing & Multi-line Fixes_
