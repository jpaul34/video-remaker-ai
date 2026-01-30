import fs from "fs";
import { logger } from "./logger";

// Helper to parse VTT/SRT time string "00:00:00.000" or "00:00:00,000" to seconds
export const parseVttTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  const normalized = timeStr.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 3) return 0;

  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const s = parseFloat(parts[2]) || 0;

  return h * 3600 + m * 60 + s;
};

// Helper to parse SRT file
export const parseSRT = (
  srtPath: string,
): Array<{ start: number; end: number; text: string }> => {
  if (!fs.existsSync(srtPath)) return [];

  const content = fs.readFileSync(srtPath, "utf-8");
  const finalSegments: Array<{ start: number; end: number; text: string }> = [];

  // 1. Parse all raw segments first
  const rawSegments: Array<{ start: number; end: number; text: string }> = [];
  const segmentRegex =
    /\d+\r?\n(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+|$)/g;

  let match;
  while ((match = segmentRegex.exec(content)) !== null) {
    const start = parseVttTime(match[1]);
    const end = parseVttTime(match[2]);
    const text = match[3]
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .join(" ");

    if (text) {
      rawSegments.push({ start, end, text });
    }
  }

  // 2. Timeline Reflow (Smart Adjustment)
  // Priority: Audio Sync (Start Time) > Readability (Duration)
  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i];
    const nextSegment = rawSegments[i + 1];

    // Calculate minimum required duration based on word count
    // Assume at least 150ms per word for readability
    const wordCount = segment.text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const minDuration = wordCount * 0.15;
    const currentDuration = segment.end - segment.start;

    // If segment is too short, try to extend it
    if (currentDuration < minDuration) {
      let maxExtension = minDuration;

      // If there is a next segment, cap extension to avoid overlap
      if (nextSegment) {
        const gap = 0.05; // Maintain 50ms gap
        const availableSpace = nextSegment.start - segment.start - gap;
        maxExtension = Math.min(minDuration, availableSpace);
      }

      // Only extend if we have space. NEVER shift the next segment's start time.
      // Shifting start times breaks sync with the audio.
      if (maxExtension > currentDuration) {
        segment.end = segment.start + maxExtension;
      }
    }
  }

  // 3. Word Interpolation with Punctuation Weighting
  for (const segment of rawSegments) {
    const words = segment.text.split(/\s+/).filter((w) => w.length > 0);

    // Calculate total "weight" of the sentence
    // Base weight = length of word
    // Punctuation bonus = extra weight for commas/periods to simulate pauses
    const getWordWeight = (word: string) => {
      let weight = word.length;
      if (/[.,;!?]$/.test(word))
        weight += 3; // Strong pause
      else if (/[:\-]$/.test(word)) weight += 2; // Medium pause
      return weight;
    };

    const totalWeight = words.reduce((acc, w) => acc + getWordWeight(w), 0);
    const duration = segment.end - segment.start;

    let currentWordStart = segment.start;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const weight = getWordWeight(word);

      // Distribute time based on weight
      let wordDuration =
        totalWeight > 0
          ? (weight / totalWeight) * duration
          : duration / words.length;

      // Safety clamp
      if (wordDuration < 0.1) wordDuration = 0.1;

      // Adjust for last word to match segment end exactly
      const remainingTime = segment.end - currentWordStart;
      if (i === words.length - 1 || wordDuration > remainingTime) {
        wordDuration = remainingTime;
      }

      // Add a tiny gap (10ms) between words
      const gap = 0.01;
      let effectiveEnd = currentWordStart + wordDuration - gap;

      if (effectiveEnd <= currentWordStart) {
        effectiveEnd = currentWordStart + wordDuration;
      }

      const cleanWord = word.trim();
      const isPunctuation = /^[.,;!?¿¡:\-]+$/.test(cleanWord);

      if (isPunctuation && finalSegments.length > 0) {
        // Merge punctuation with previous word
        const lastIndex = finalSegments.length - 1;
        finalSegments[lastIndex].text += cleanWord;
        // Extend last word's end time to cover the punctuation's duration
        finalSegments[lastIndex].end = parseFloat(effectiveEnd.toFixed(3));
      } else {
        finalSegments.push({
          text: word,
          start: parseFloat(currentWordStart.toFixed(3)),
          end: parseFloat(effectiveEnd.toFixed(3)),
        });
      }

      currentWordStart += wordDuration;
    }
  }

  logger.log(
    `Parsed ${finalSegments.length} segments from SRT (Smart Sync). First word: ${JSON.stringify(finalSegments[0], null, 2)}`,
  );
  return finalSegments;
};

export const generateSubtitles = (
  script: string,
  duration: number,
  jsonPath?: string,
): Array<{ text: string; start: number; end: number }> => {
  logger.log(
    `generateSubtitles: Iniciando. JSON Path: ${jsonPath}, Duración: ${duration}`,
  );
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    logger.log(
      "generateSubtitles: No se encontró JSON de palabras, usando sincronización simple.",
    );
    const words = script.trim().split(/\s+/);
    const totalCharacters = words.reduce((acc, word) => acc + word.length, 0);
    const timePerChar = (duration * 0.95) / totalCharacters;

    const subtitles: Array<{ text: string; start: number; end: number }> = [];
    let currentTime = 0;

    for (const word of words) {
      const wordDuration = word.length * timePerChar;
      subtitles.push({
        text: word,
        start: currentTime,
        end: currentTime + wordDuration,
      });
      currentTime += wordDuration;
    }
    return subtitles;
  }

  let wordsData: Array<{ text: string; start: number; end: number }> = [];

  try {
    if (jsonPath && fs.existsSync(jsonPath)) {
      wordsData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      logger.log(
        `generateSubtitles: Cargadas ${wordsData.length} palabras desde JSON: ${jsonPath}`,
      );
    } else {
      logger.log("generateSubtitles: No se encontró JSON de palabras.");
    }
  } catch (e) {
    logger.error(`generateSubtitles: Error al parsear JSON en ${jsonPath}`, e);
  }

  // Fallback if no words were loaded
  if (wordsData.length === 0) {
    logger.log("generateSubtitles: Usando sincronización simple (Fallback).");
    const words = script.trim().split(/\s+/);
    const totalCharacters = words.reduce((acc, word) => acc + word.length, 0);
    // Use 95% of duration to avoid cutting off the last word
    const timePerChar = (duration * 0.95) / (totalCharacters || 1);

    let currentTime = 0;
    for (const word of words) {
      const wordDuration = Math.max(0.1, word.length * timePerChar); // Min 0.1s per word
      wordsData.push({
        text: word,
        start: parseFloat(currentTime.toFixed(3)),
        end: parseFloat((currentTime + wordDuration).toFixed(3)),
      });
      currentTime += wordDuration;
    }
    logger.log(
      `generateSubtitles: Generadas ${wordsData.length} palabras por aproximación.`,
    );
  }

  if (wordsData.length > 0) {
    logger.log(
      `generateSubtitles: Primera palabra antes de re-inyección: ${JSON.stringify(wordsData[0])}`,
    );
    // Reinject punctuation from the original script
    wordsData = reinjectPunctuation(script, wordsData);
    logger.log(
      `generateSubtitles: Primera palabra después de re-inyección: ${JSON.stringify(wordsData[0])}`,
    );
  }

  return wordsData;
};

/**
 * Re-injects punctuation from the original script by aligning word by word.
 * This fixes cases where TTS engine strips opening punctuation like ¿ and ¡.
 */
function reinjectPunctuation(
  script: string,
  timedWords: Array<{ text: string; start: number; end: number }>,
): Array<{ text: string; start: number; end: number }> {
  // Split script into words, preserving original punctuation
  const originalWords = script.trim().split(/\s+/);
  if (originalWords.length === 0 || timedWords.length === 0) return timedWords;

  const result: Array<{ text: string; start: number; end: number }> = [];
  let scriptIdx = 0;

  for (const timedWord of timedWords) {
    const timedText = timedWord.text;

    // Look ahead a bit to find a match if there's a discrepancy
    let found = false;
    const lookAhead = Math.min(scriptIdx + 5, originalWords.length);

    for (let i = scriptIdx; i < lookAhead; i++) {
      const orig = originalWords[i];

      // Clean both words for comparison (remove common punctuation but keep letters/numbers)
      const cleanOrig = orig.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi, "");
      const cleanTimed = timedText
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúüñ]/gi, "");

      // If they match or one contains the other (e.g. "setenta" vs "setentaporciento")
      if (
        cleanOrig &&
        cleanTimed &&
        (cleanOrig === cleanTimed ||
          cleanOrig.includes(cleanTimed) ||
          cleanTimed.includes(cleanOrig))
      ) {
        // Use the original word with its full punctuation
        result.push({
          ...timedWord,
          text: orig,
        });
        scriptIdx = i + 1;
        found = true;
        break;
      }
    }

    // If no match found, keep the timed word as is
    if (!found) {
      result.push(timedWord);
    }
  }

  return result;
}

/**
 * Formats a time in seconds to ASS format (H:MM:SS.cc)
 */
function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

const hexToAssColor = (hex: string): string => {
  if (!hex || hex.length < 7) return "&H00FFFFFF&";
  const r = hex.substring(1, 3);
  const g = hex.substring(3, 5);
  const b = hex.substring(5, 7);
  // ASS format for color is &HAABBGGRR& (Alpha-Blue-Green-Red)
  // For PrimaryColour, Alpha is usually 00 (Opaque)
  return `&H00${b}${g}${r}&`;
};

export function generateAssContent(
  subtitles: Array<{
    start: number;
    end: number;
    text: string;
    style?: string;
  }>,
  config: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    videoWidth: number;
    videoHeight: number;
    alignment: number;
  },
): string {
  const {
    fontFamily,
    fontSize,
    fontWeight,
    videoWidth,
    videoHeight,
    alignment,
  } = config;
  logger.log(
    `[generateAssContent] Config - Alignment: ${alignment}, Size: ${fontSize}, Weight: ${fontWeight}, Font: ${fontFamily}`,
  );

  const playResY = videoHeight;
  const playResX = videoWidth;
  logger.log(
    `[generateAssContent] Config - Alignment: ${alignment}, Size: ${fontSize}, Font: ${fontFamily}, Res: ${playResX}x${playResY}`,
  );

  const isBoldValue = 0; // Prefer tags for explicit control

  let content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontFamily},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,8,2,${alignment},120,120,180,1
Style: Opaque,${fontFamily},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,3,24,0,${alignment},120,120,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const sub of subtitles) {
    const start = formatAssTime(sub.start);
    const end = formatAssTime(sub.end);
    const styleName = sub.style || "Default";
    content += `Dialogue: 0,${start},${end},${styleName},,0000,0000,0000,,{\\q2}${sub.text}\n`;
  }

  return content;
}

// Helper to group subtitles by words per line and lines per subtitle
// NEW: Implementing cumulative "growing" text logic for ASS (NON-OVERLAPPING intervals)
export const groupSubtitles = (
  subtitles: Array<{ text: string; start: number; end: number }>,
  wordsPerLine: number,
  linesPerSubtitle: number = 1,
  styling?: {
    useGeneralStyle: boolean;
    fontFamily: string;
    subtitleColor: string;
    fontSize: number;
    fontWeight: string;
    subtitleStyleType?: string;
    subtitleTextAlign?: string;
    lineStyles: any[];
    videoHeight: number;
    videoWidth: number;
  },
): Array<{ text: string; start: number; end: number; style?: string }> => {
  if (subtitles.length === 0) return [];

  const totalWordsPerBlock = wordsPerLine * linesPerSubtitle;
  let currentGroup: Array<{ text: string; start: number; end: number }> = [];
  const finalSegments: Array<{
    text: string;
    start: number;
    end: number;
    style?: string;
  }> = [];

  const vH = styling?.videoHeight || 1920;
  const vW = styling?.videoWidth || 1080;
  const textAlign = styling?.subtitleTextAlign || "center";
  const fontSize = styling?.fontSize || 64;

  let anTag = "5"; // Default center
  let targetX = vW / 2;
  if (textAlign === "left") {
    anTag = "4";
    targetX = 120;
  } else if (textAlign === "right") {
    anTag = "6";
    targetX = vW - 120;
  }

  for (let i = 0; i < subtitles.length; i++) {
    currentGroup.push(subtitles[i]);

    if (
      currentGroup.length >= totalWordsPerBlock ||
      i === subtitles.length - 1
    ) {
      const blockEnd = currentGroup[currentGroup.length - 1].end;

      for (let k = 0; k < currentGroup.length; k++) {
        const cumulativeWords = currentGroup.slice(0, k + 1);
        const startTime = currentGroup[k].start;
        const endTime =
          k < currentGroup.length - 1 ? currentGroup[k + 1].start : blockEnd;

        if (endTime <= startTime) continue;

        for (let j = 0; j < cumulativeWords.length; j += wordsPerLine) {
          const lineWords = cumulativeWords.slice(j, j + wordsPerLine);
          const lineIdx = Math.floor(j / wordsPerLine);

          let lineStyledText = "";
          let lineStyleName = "Default";

          const targetY =
            vH / 2 + (lineIdx - (linesPerSubtitle - 1) / 2) * (fontSize * 1.5);

          for (let l = 0; l < lineWords.length; l++) {
            const wordObj = lineWords[l];
            let color = styling?.subtitleColor || "#FFFFFF";
            let size = styling?.fontSize || 48;
            let font = styling?.fontFamily || "Arial";
            let weight = styling?.fontWeight || "bold";
            let stype = styling?.subtitleStyleType || "outline";

            if (
              styling &&
              !styling.useGeneralStyle &&
              styling.lineStyles?.[lineIdx]
            ) {
              const ls = styling.lineStyles[lineIdx];
              if (ls.color) color = ls.color;
              if (ls.fontSize) size = ls.fontSize;
              if (ls.fontFamily) font = ls.fontFamily;
              if (ls.fontWeight) weight = ls.fontWeight;
              if (ls.styleType) stype = ls.styleType;
            }

            if (stype === "shadow") lineStyleName = "Opaque";

            const assColor = hexToAssColor(color);
            let weightTag = "\\b400";
            if (weight === "bold") weightTag = "\\b1";
            else if (weight === "semibold") weightTag = "\\b600";

            lineStyledText += `{\\c${assColor}\\fn${font}\\fs${size}${weightTag}}${wordObj.text.toUpperCase()}`;
            if (l < lineWords.length - 1) lineStyledText += " ";
          }

          // Apply absolute positioning and alignment override
          // NEW: Add \be8 for soft/rounded-ish box edges when using Opaque style
          const blurTag = lineStyleName === "Opaque" ? "\\be8" : "";
          const finalText = `{\\an${anTag}${blurTag}\\pos(${targetX.toFixed(0)},${targetY.toFixed(0)})}${lineStyledText.trim()}`;

          finalSegments.push({
            text: finalText,
            start: startTime,
            end: endTime,
            style: lineStyleName,
          });
        }
      }
      currentGroup = [];
    }
  }

  return finalSegments;
};
