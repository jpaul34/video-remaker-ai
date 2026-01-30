"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const child_process = require("child_process");
const https = require("https");
const genai = require("@google/genai");
const dotenv = require("dotenv");
class ProcessLogger {
  logs = [];
  projectDir = "";
  setProjectDir(dir) {
    this.projectDir = dir;
    this.logs = [];
    this.log(`--- Inicio de Proceso: ${(/* @__PURE__ */ new Date()).toLocaleString()} ---`);
  }
  log(message) {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }
  error(message, error) {
    const errorMessage = error ? `${message}: ${error.message || error}` : message;
    this.log(`ERROR: ${errorMessage}`);
  }
  save() {
    if (!this.projectDir) return;
    try {
      const logPath = path.join(this.projectDir, "log-proceso.txt");
      fs.writeFileSync(logPath, this.logs.join("\n"), "utf-8");
      console.log(`Log guardado en: ${logPath}`);
    } catch (e) {
      console.error("Error al guardar el log del proceso:", e);
    }
  }
  getLogs() {
    return this.logs;
  }
}
const logger = new ProcessLogger();
const parseVttTime = (timeStr) => {
  if (!timeStr) return 0;
  const normalized = timeStr.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 3) return 0;
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const s = parseFloat(parts[2]) || 0;
  return h * 3600 + m * 60 + s;
};
const parseSRT = (srtPath) => {
  if (!fs.existsSync(srtPath)) return [];
  const content = fs.readFileSync(srtPath, "utf-8");
  const finalSegments = [];
  const rawSegments = [];
  const segmentRegex = /\d+\r?\n(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+|$)/g;
  let match;
  while ((match = segmentRegex.exec(content)) !== null) {
    const start = parseVttTime(match[1]);
    const end = parseVttTime(match[2]);
    const text = match[3].trim().split(/\r?\n/).map((l) => l.trim()).join(" ");
    if (text) {
      rawSegments.push({ start, end, text });
    }
  }
  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i];
    const nextSegment = rawSegments[i + 1];
    const wordCount = segment.text.split(/\s+/).filter((w) => w.length > 0).length;
    const minDuration = wordCount * 0.15;
    const currentDuration = segment.end - segment.start;
    if (currentDuration < minDuration) {
      let maxExtension = minDuration;
      if (nextSegment) {
        const gap = 0.05;
        const availableSpace = nextSegment.start - segment.start - gap;
        maxExtension = Math.min(minDuration, availableSpace);
      }
      if (maxExtension > currentDuration) {
        segment.end = segment.start + maxExtension;
      }
    }
  }
  for (const segment of rawSegments) {
    const words = segment.text.split(/\s+/).filter((w) => w.length > 0);
    const getWordWeight = (word) => {
      let weight = word.length;
      if (/[.,;!?]$/.test(word))
        weight += 3;
      else if (/[:\-]$/.test(word)) weight += 2;
      return weight;
    };
    const totalWeight = words.reduce((acc, w) => acc + getWordWeight(w), 0);
    const duration = segment.end - segment.start;
    let currentWordStart = segment.start;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const weight = getWordWeight(word);
      let wordDuration = totalWeight > 0 ? weight / totalWeight * duration : duration / words.length;
      if (wordDuration < 0.1) wordDuration = 0.1;
      const remainingTime = segment.end - currentWordStart;
      if (i === words.length - 1 || wordDuration > remainingTime) {
        wordDuration = remainingTime;
      }
      const gap = 0.01;
      let effectiveEnd = currentWordStart + wordDuration - gap;
      if (effectiveEnd <= currentWordStart) {
        effectiveEnd = currentWordStart + wordDuration;
      }
      const cleanWord = word.trim();
      const isPunctuation = /^[.,;!?¿¡:\-]+$/.test(cleanWord);
      if (isPunctuation && finalSegments.length > 0) {
        const lastIndex = finalSegments.length - 1;
        finalSegments[lastIndex].text += cleanWord;
        finalSegments[lastIndex].end = parseFloat(effectiveEnd.toFixed(3));
      } else {
        finalSegments.push({
          text: word,
          start: parseFloat(currentWordStart.toFixed(3)),
          end: parseFloat(effectiveEnd.toFixed(3))
        });
      }
      currentWordStart += wordDuration;
    }
  }
  logger.log(
    `Parsed ${finalSegments.length} segments from SRT (Smart Sync). First word: ${JSON.stringify(finalSegments[0], null, 2)}`
  );
  return finalSegments;
};
const generateSubtitles = (script, duration, jsonPath) => {
  logger.log(
    `generateSubtitles: Iniciando. JSON Path: ${jsonPath}, Duración: ${duration}`
  );
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    logger.log(
      "generateSubtitles: No se encontró JSON de palabras, usando sincronización simple."
    );
    const words = script.trim().split(/\s+/);
    const totalCharacters = words.reduce((acc, word) => acc + word.length, 0);
    const timePerChar = duration * 0.95 / totalCharacters;
    const subtitles = [];
    let currentTime = 0;
    for (const word of words) {
      const wordDuration = word.length * timePerChar;
      subtitles.push({
        text: word,
        start: currentTime,
        end: currentTime + wordDuration
      });
      currentTime += wordDuration;
    }
    return subtitles;
  }
  let wordsData = [];
  try {
    if (jsonPath && fs.existsSync(jsonPath)) {
      wordsData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      logger.log(
        `generateSubtitles: Cargadas ${wordsData.length} palabras desde JSON: ${jsonPath}`
      );
    } else {
      logger.log("generateSubtitles: No se encontró JSON de palabras.");
    }
  } catch (e) {
    logger.error(`generateSubtitles: Error al parsear JSON en ${jsonPath}`, e);
  }
  if (wordsData.length === 0) {
    logger.log("generateSubtitles: Usando sincronización simple (Fallback).");
    const words = script.trim().split(/\s+/);
    const totalCharacters = words.reduce((acc, word) => acc + word.length, 0);
    const timePerChar = duration * 0.95 / (totalCharacters || 1);
    let currentTime = 0;
    for (const word of words) {
      const wordDuration = Math.max(0.1, word.length * timePerChar);
      wordsData.push({
        text: word,
        start: parseFloat(currentTime.toFixed(3)),
        end: parseFloat((currentTime + wordDuration).toFixed(3))
      });
      currentTime += wordDuration;
    }
    logger.log(
      `generateSubtitles: Generadas ${wordsData.length} palabras por aproximación.`
    );
  }
  if (wordsData.length > 0) {
    logger.log(
      `generateSubtitles: Primera palabra antes de re-inyección: ${JSON.stringify(wordsData[0])}`
    );
    wordsData = reinjectPunctuation(script, wordsData);
    logger.log(
      `generateSubtitles: Primera palabra después de re-inyección: ${JSON.stringify(wordsData[0])}`
    );
  }
  return wordsData;
};
function reinjectPunctuation(script, timedWords) {
  const originalWords = script.trim().split(/\s+/);
  if (originalWords.length === 0 || timedWords.length === 0) return timedWords;
  const result = [];
  let scriptIdx = 0;
  for (const timedWord of timedWords) {
    const timedText = timedWord.text;
    let found = false;
    const lookAhead = Math.min(scriptIdx + 5, originalWords.length);
    for (let i = scriptIdx; i < lookAhead; i++) {
      const orig = originalWords[i];
      const cleanOrig = orig.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi, "");
      const cleanTimed = timedText.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi, "");
      if (cleanOrig && cleanTimed && (cleanOrig === cleanTimed || cleanOrig.includes(cleanTimed) || cleanTimed.includes(cleanOrig))) {
        result.push({
          ...timedWord,
          text: orig
        });
        scriptIdx = i + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      result.push(timedWord);
    }
  }
  return result;
}
function formatAssTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor(seconds % 1 * 100);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}
const hexToAssColor = (hex) => {
  if (!hex || hex.length < 7) return "&H00FFFFFF&";
  const r = hex.substring(1, 3);
  const g = hex.substring(3, 5);
  const b = hex.substring(5, 7);
  return `&H00${b}${g}${r}&`;
};
function generateAssContent(subtitles, config) {
  const {
    fontFamily,
    fontSize,
    fontWeight,
    videoWidth,
    videoHeight,
    alignment,
    borderWidth = "medium",
    borderColor = "#000000",
    marginL = 120,
    marginR = 120,
    marginT = 120,
    marginB = 120
  } = config;
  logger.log(
    `[generateAssContent] Config - Alignment: ${alignment}, Size: ${fontSize}, Weight: ${fontWeight}, Font: ${fontFamily}`
  );
  const playResY = videoHeight;
  const playResX = videoWidth;
  logger.log(
    `[generateAssContent] Config - Alignment: ${alignment}, Size: ${fontSize}, Font: ${fontFamily}, Res: ${playResX}x${playResY}`
  );
  const borderWidthMap = {
    thin: 4,
    // Was 2, increased for visibility
    medium: 8,
    // Was 3, increased for visibility
    thick: 14
    // Was 5, increased for visibility
  };
  const outlineWidth = borderWidthMap[borderWidth];
  logger.log(
    `[generateAssContent] Border Config - borderWidth: ${borderWidth}, outlineWidth: ${outlineWidth}, borderColor: ${borderColor}`
  );
  const hexToAssColor2 = (hex) => {
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length !== 6) return "&H00000000";
    const r = cleanHex.substring(0, 2);
    const g = cleanHex.substring(2, 4);
    const b = cleanHex.substring(4, 6);
    return `&H00${b}${g}${r}`.toUpperCase();
  };
  const outlineColorASS = hexToAssColor2(borderColor);
  logger.log(
    `[generateAssContent] Color conversion - Input: ${borderColor}, Output: ${outlineColorASS}`
  );
  let content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontFamily},${fontSize},&H00FFFFFF,&H000000FF,${outlineColorASS},&H80000000,0,0,0,0,100,100,0,0,1,${outlineWidth},0,${alignment},${marginL},${marginR},${alignment >= 7 ? marginT : marginB},1
Style: Opaque,${fontFamily},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,3,24,0,${alignment},${marginL},${marginR},${alignment >= 7 ? marginT : marginB},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  for (const sub of subtitles) {
    const start = formatAssTime(sub.start);
    const end = formatAssTime(sub.end);
    const styleName = sub.style || "Default";
    content += `Dialogue: 0,${start},${end},${styleName},,0000,0000,0000,,{\\q2}${sub.text}
`;
  }
  return content;
}
const groupSubtitles = (subtitles, wordsPerLine, linesPerSubtitle = 1, styling) => {
  if (subtitles.length === 0) return [];
  const totalWordsPerBlock = wordsPerLine * linesPerSubtitle;
  let currentGroup = [];
  const finalSegments = [];
  const vH = styling?.videoHeight || 1920;
  const vW = styling?.videoWidth || 1080;
  const textAlign = styling?.subtitleTextAlign;
  const fontSize = styling?.fontSize;
  const marginL = styling?.marginL ?? 120;
  const marginR = styling?.marginR ?? 120;
  const marginT = styling?.marginT ?? 120;
  const marginB = styling?.marginB ?? 120;
  const subPos = styling?.subtitlePosition;
  const posBase = subPos.split("-")[0];
  let hAlign = 2;
  if (textAlign === "left") hAlign = 1;
  if (textAlign === "right") hAlign = 3;
  let vAlign = 0;
  if (posBase === "top") vAlign = 6;
  if (posBase === "middle") vAlign = 3;
  const anTag = (vAlign + hAlign).toString();
  let targetX = vW / 2;
  if (textAlign === "left") {
    targetX = marginL;
  } else if (textAlign === "right") {
    targetX = vW - marginR;
  }
  for (let i = 0; i < subtitles.length; i++) {
    currentGroup.push(subtitles[i]);
    if (currentGroup.length >= totalWordsPerBlock || i === subtitles.length - 1) {
      const blockEnd = currentGroup[currentGroup.length - 1].end;
      for (let k = 0; k < currentGroup.length; k++) {
        const cumulativeWords = currentGroup.slice(0, k + 1);
        const startTime = currentGroup[k].start;
        const endTime = k < currentGroup.length - 1 ? currentGroup[k + 1].start : blockEnd;
        if (endTime <= startTime) continue;
        for (let j = 0; j < cumulativeWords.length; j += wordsPerLine) {
          const lineWords = cumulativeWords.slice(j, j + wordsPerLine);
          const lineIdx = Math.floor(j / wordsPerLine);
          let lineStyledText = "";
          let lineStyleName = "Default";
          let targetY = 0;
          if (posBase === "top") {
            targetY = marginT + lineIdx * (fontSize * 1.5);
          } else if (posBase === "middle") {
            const safeHeight = vH - marginT - marginB;
            const safeCenter = marginT + safeHeight / 2;
            targetY = safeCenter + (lineIdx - (linesPerSubtitle - 1) / 2) * (fontSize * 1.5);
          } else {
            targetY = vH - marginB - (linesPerSubtitle - 1 - lineIdx) * (fontSize * 1.5);
          }
          for (let l = 0; l < lineWords.length; l++) {
            const wordObj = lineWords[l];
            let color = styling?.subtitleColor;
            let size = styling?.fontSize;
            let font = styling?.fontFamily;
            let weight = styling?.fontWeight;
            if (styling && !styling.useGeneralStyle && styling.lineStyles?.[lineIdx]) {
              const ls = styling.lineStyles[lineIdx];
              if (ls.color) color = ls.color;
              if (ls.fontSize) size = ls.fontSize;
              if (ls.fontFamily) font = ls.fontFamily;
              if (ls.fontWeight) weight = ls.fontWeight;
            }
            const assColor = hexToAssColor(color);
            let weightTag = "\\b400";
            if (weight === "bold") weightTag = "\\b1";
            else if (weight === "semibold") weightTag = "\\b600";
            lineStyledText += `{\\c${assColor}\\fn${font}\\fs${size}${weightTag}}${wordObj.text.toUpperCase()}`;
            if (l < lineWords.length - 1) lineStyledText += " ";
          }
          const finalText = `{\\an${anTag}\\pos(${targetX.toFixed(0)},${targetY.toFixed(0)})}${lineStyledText.trim()}`;
          finalSegments.push({
            text: finalText,
            start: startTime,
            end: endTime,
            style: lineStyleName
          });
        }
      }
      currentGroup = [];
    }
  }
  return finalSegments;
};
const getAlignment = (position, textAlign = "center") => {
  logger.log(
    `[getAlignment] Input - Position: ${position}, TextAlign: ${textAlign}`
  );
  const posBase = position.split("-")[0];
  const align = textAlign.toLowerCase();
  let result = 2;
  if (posBase === "top") {
    if (align === "left") result = 7;
    else if (align === "right") result = 9;
    else result = 8;
  } else if (posBase === "middle") {
    if (align === "left") result = 4;
    else if (align === "right") result = 6;
    else result = 5;
  } else {
    if (align === "left") result = 1;
    else if (align === "right") result = 3;
    else result = 2;
  }
  logger.log(`[getAlignment] Output: ${result}`);
  return result;
};
const addSubtitlesToVideo = (config) => {
  return new Promise((resolve, reject) => {
    const { videoPath, subtitles, style, outputPath } = config;
    if (!subtitles || subtitles.length === 0) {
      logger.log("[addSubtitlesToVideo] No hay subtítulos para procesar.");
      return resolve(videoPath);
    }
    logger.log(
      `[addSubtitlesToVideo] Iniciando proceso para ${subtitles.length} subtítulos.`
    );
    const normVideoPath = videoPath;
    const projectTempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(projectTempDir)) {
      fs.mkdirSync(projectTempDir, { recursive: true });
    }
    const tempFileName = `video_subs_temp_${Date.now()}.mp4`;
    const tempOutputPath = path.join(projectTempDir, tempFileName);
    const outputDir = path.dirname(videoPath);
    const finalOutputPath = outputPath || path.join(outputDir, `video_subs_${Date.now()}.mp4`);
    ffmpeg.ffprobe(normVideoPath, (err, metadata) => {
      if (err) {
        logger.error(
          `[addSubtitlesToVideo] Error al analizar video: ${err.message}`
        );
        return reject(
          new Error(`Failed to probe video for subtitles: ${err.message}`)
        );
      }
      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;
      const alignment = getAlignment(
        style.position || "bottom-center",
        style.subtitleTextAlign || "center"
      );
      logger.log(
        `[addSubtitlesToVideo] Style values - borderWidth: ${style.borderWidth}, borderColor: ${style.borderColor}`
      );
      const assContent = generateAssContent(subtitles, {
        fontFamily: style.fontFamily || "Arial",
        fontSize: style.fontSize || style.size || 48,
        fontWeight: style.fontWeight || "bold",
        videoWidth: width,
        videoHeight: height,
        alignment,
        borderWidth: style.borderWidth || "medium",
        borderColor: style.borderColor || "#000000",
        marginL: style.marginL || 120,
        marginR: style.marginR || 120,
        marginT: style.marginT || 120,
        marginB: style.marginB || 180
      });
      const assPath = path.join(
        path.dirname(finalOutputPath),
        `subtitles_${Date.now()}.ass`
      );
      logger.log(
        `[addSubtitlesToVideo] Escribiendo archivo ASS en: ${assPath}`
      );
      fs.writeFileSync(assPath, assContent, "utf-8");
      const escapedAssPath = assPath.replace(/\\/g, "/").replace(":", "\\:");
      const filterString = `subtitles=filename='${escapedAssPath}'`;
      logger.log(
        `[addSubtitlesToVideo] Iniciando FFmpeg para quemar subtítulos...`
      );
      logger.log(`[addSubtitlesToVideo] Filtro: ${filterString}`);
      const ffmpegCmd = ffmpeg(normVideoPath).outputOptions([
        "-vf",
        filterString,
        "-map",
        "0:v",
        // Explicitly map video
        "-map",
        "0:a",
        // Explicitly map audio
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        // Balanced preset
        "-crf",
        "23",
        // Standard quality
        "-c:a",
        "copy"
      ]).output(tempOutputPath).on("start", (commandLine) => {
        logger.log(`[addSubtitlesToVideo] FFmpeg iniciado.`);
        logger.log(`[addSubtitlesToVideo] COMANDO EXACTO: ${commandLine}`);
      }).on("end", () => {
        logger.log("[addSubtitlesToVideo] FFmpeg finalizado con éxito.");
        try {
          if (!fs.existsSync(path.dirname(finalOutputPath))) {
            fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
          }
          fs.copyFileSync(tempOutputPath, finalOutputPath);
          fs.unlinkSync(tempOutputPath);
          logger.log(
            `[addSubtitlesToVideo] Video finalizado en: ${finalOutputPath}`
          );
          resolve(finalOutputPath);
        } catch (e) {
          reject(new Error(`Failed to move final video: ${e.message}`));
        }
      }).on("error", (err2, stdout, stderr) => {
        logger.error(`[addSubtitlesToVideo] Error en FFmpeg: ${err2.message}`);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
        reject(
          new Error(
            `Failed to burn subtitles: ${err2.message}. Stderr: ${stderr}`
          )
        );
      });
      ffmpegCmd.run();
    });
  });
};
const downloadTikTokAudio = (url) => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), "temp", "audio.mp3");
    const ytDlpPath = path.join(process.cwd(), "resources", "yt-dlp.exe");
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const ytdlp = child_process.spawn(ytDlpPath, [
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      outputPath,
      url
    ]);
    ytdlp.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
    ytdlp.on("error", reject);
  });
};
const getAudioDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration || 0);
      }
    });
  });
};
const generateVoice = async (text, voiceName, outputPath) => {
  const maxRetries = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log(
        `generateVoice: Intento ${attempt}/${maxRetries} para edge-tts.`
      );
      return await new Promise((resolve, reject) => {
        const jsonPath = outputPath.replace(/\.[^/.]+$/, ".json");
        const srtPath = outputPath.replace(/\.[^/.]+$/, ".srt");
        const textPath = outputPath.replace(/\.[^/.]+$/, ".txt");
        try {
          fs.writeFileSync(textPath, text, "utf-8");
        } catch (e) {
          return reject(
            new Error(`Failed to write temp text file: ${e.message}`)
          );
        }
        const pythonProcess = child_process.spawn("python", [
          "-m",
          "edge_tts",
          "--file",
          textPath,
          "--voice",
          voiceName,
          "--write-media",
          outputPath,
          "--write-subtitles",
          srtPath
        ]);
        let errorOutput = "";
        pythonProcess.stderr.on("data", (data) => {
          const msg = data.toString().trim();
          errorOutput += msg;
          logger.log(`[edge-tts stderr] ${msg}`);
        });
        pythonProcess.on("close", (code) => {
          if (fs.existsSync(textPath)) {
            try {
              fs.unlinkSync(textPath);
            } catch (e) {
            }
          }
          if (code === 0 && fs.existsSync(outputPath) && fs.existsSync(srtPath)) {
            try {
              const segments = parseSRT(srtPath);
              fs.writeFileSync(
                jsonPath,
                JSON.stringify(segments, null, 2),
                "utf-8"
              );
              try {
                fs.unlinkSync(srtPath);
              } catch (e) {
              }
              resolve({ audioPath: outputPath, jsonPath });
            } catch (parseError) {
              reject(new Error(`Failed to parse SRT: ${parseError.message}`));
            }
          } else {
            reject(
              new Error(`edge-tts failed with code ${code}: ${errorOutput}`)
            );
          }
        });
        pythonProcess.on("error", (err) => {
          if (fs.existsSync(textPath)) {
            try {
              fs.unlinkSync(textPath);
            } catch (e) {
            }
          }
          reject(new Error(`Failed to start python process: ${err.message}`));
        });
      });
    } catch (error) {
      lastError = error;
      logger.error(
        `generateVoice: Error en intento ${attempt}: ${error.message}`
      );
      if (attempt < maxRetries) {
        const delay = attempt * 2e3;
        logger.log(`generateVoice: Reintentando en ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
};
const createPlaceholderImage = (outputPath, text, width = 1280, height = 720) => {
  return new Promise((resolve, reject) => {
    try {
      const bmpPath = outputPath.replace(/\.png$/i, ".bmp");
      const colors = [
        [
          66,
          77,
          58,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          54,
          0,
          0,
          0,
          40,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          0,
          24,
          0,
          0,
          0,
          0,
          0,
          4,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          255,
          0,
          0,
          0
        ],
        // Red
        [
          66,
          77,
          58,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          54,
          0,
          0,
          0,
          40,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          0,
          24,
          0,
          0,
          0,
          0,
          0,
          4,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          255,
          0
        ],
        // Blue
        [
          66,
          77,
          58,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          54,
          0,
          0,
          0,
          40,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          0,
          24,
          0,
          0,
          0,
          0,
          0,
          4,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          255,
          0,
          0
        ]
        // Green
      ];
      const bmpData = colors[Math.floor(Math.random() * colors.length)];
      fs.writeFileSync(bmpPath, Buffer.from(bmpData));
      console.log(`Created placeholder BMP: ${bmpPath}`);
      resolve();
    } catch (error) {
      reject(new Error(`Failed to create placeholder image: ${error.message}`));
    }
  });
};
const convertImageToBmp = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath).output(outputPath).outputOptions(["-pix_fmt", "bgr24"]).on("end", () => resolve()).on(
      "error",
      (err) => reject(new Error(`Failed to convert image: ${err.message}`))
    ).run();
  });
};
const getFfmpegPath = () => {
  const possiblePaths = [
    path.join(process.cwd(), "resources", "ffmpeg.exe"),
    path.join(process.cwd(), "resources", "ffmpeg"),
    path.join(__dirname, "../../resources/ffmpeg.exe"),
    // For dev/prod structure
    path.join(process.cwd(), "ffmpeg.exe"),
    "ffmpeg"
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "ffmpeg";
};
const getFfprobePath = () => {
  const possiblePaths = [
    path.join(process.cwd(), "resources", "ffprobe.exe"),
    path.join(process.cwd(), "resources", "ffprobe"),
    path.join(__dirname, "../../resources/ffprobe.exe"),
    // For dev/prod structure
    path.join(process.cwd(), "ffprobe.exe"),
    "ffprobe"
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "ffprobe";
};
const configureFfmpeg = () => {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();
  console.log(`Configuring FFmpeg: ${ffmpegPath}`);
  console.log(`Configuring FFprobe: ${ffprobePath}`);
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
};
const killFfmpegProcesses = () => {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "taskkill /F /IM ffmpeg.exe /T" : "pkill -9 ffmpeg";
    child_process.exec(command, (error) => {
      if (error) {
        console.log(
          "No FFmpeg processes to kill or error killing them:",
          error.message
        );
      } else {
        console.log("FFmpeg processes killed successfully.");
      }
      resolve();
    });
  });
};
const addAvatarOverlay = (videoPath, config) => {
  return new Promise((resolve, reject) => {
    const {
      path: avatarPath,
      position,
      size,
      chromaKey,
      duration
    } = config;
    if (!fs.existsSync(avatarPath)) {
      logger.error(`[addAvatarOverlay] Avatar file not found: ${avatarPath}`);
      return resolve(videoPath);
    }
    const outputPath = videoPath.replace(/\.mp4$/i, "_avatar.mp4");
    logger.log(
      `[addAvatarOverlay] Adding avatar to video. Output: ${outputPath}`
    );
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        logger.error(`[addAvatarOverlay] Probe error: ${err.message}`);
        return reject(new Error(`Failed to probe video: ${err.message}`));
      }
      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );
      videoStream?.width || 1280;
      const H = videoStream?.height || 720;
      const targetHeight = Math.round(H * size);
      let filterChain = [];
      let avatarStream = "[1:v]";
      filterChain.push(`${avatarStream}scale=-1:${targetHeight}[scaled]`);
      let lastStream = "[scaled]";
      if (chromaKey && chromaKey !== "none") {
        const color = chromaKey.replace("#", "0x");
        filterChain.push(`${lastStream}colorkey=${color}:0.1:0.1[transparent]`);
        lastStream = "[transparent]";
      }
      const margin = 0;
      let overlayX = "";
      let overlayY = "";
      switch (position) {
        case "bottom-right":
          overlayX = `W-w-${margin}`;
          overlayY = `H-h-${margin}`;
          break;
        case "bottom-left":
          overlayX = `${margin}`;
          overlayY = `H-h-${margin}`;
          break;
        case "top-right":
          overlayX = `W-w-${margin}`;
          overlayY = `${margin}`;
          break;
        case "top-left":
          overlayX = `${margin}`;
          overlayY = `${margin}`;
          break;
        default:
          overlayX = `W-w-${margin}`;
          overlayY = `H-h-${margin}`;
      }
      filterChain.push(
        `[0:v]${lastStream}overlay=x=${overlayX}:y=${overlayY}[outv]`
      );
      let command = ffmpeg(videoPath).input(avatarPath).complexFilter(filterChain, ["outv"]);
      const outputOptions = [
        "-map",
        "0:a",
        // Explicitly map audio from base video (Input 0)
        // "-map", "[outv]", // Removed to avoid double mapping (handled by complexFilter)
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28"
      ];
      outputOptions.push("-c:a", "copy");
      if (duration) {
        outputOptions.push("-t", `${duration}`);
      }
      command.outputOptions(outputOptions).output(outputPath).on("start", (cmd) => logger.log(`[addAvatarOverlay] Command: ${cmd}`)).on("end", () => {
        logger.log(`[addAvatarOverlay] Complete.`);
        if (fs.existsSync(videoPath)) {
          try {
            fs.unlinkSync(videoPath);
          } catch (e) {
            logger.log(
              `[addAvatarOverlay] Warning: Could not delete intermediate video: ${videoPath}`
            );
          }
        }
        resolve(outputPath);
      }).on("error", (err2, stdout, stderr) => {
        logger.error(`[addAvatarOverlay] Error: ${err2.message}`);
        logger.error(`[addAvatarOverlay] Stderr: ${stderr}`);
        reject(err2);
      });
      command.run();
    });
  });
};
const resolutions = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "3:4": { w: 810, h: 1080 }
};
const createVideo = (config) => {
  return new Promise(async (resolve, reject) => {
    const {
      imagesDir,
      audioPath,
      outputPath,
      duration,
      aspectRatio,
      imageDurations
    } = config;
    const normOutputPath = outputPath;
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const resolutions2 = {
      "16:9": { w: 1920, h: 1080 },
      "9:16": { w: 1080, h: 1920 },
      "1:1": { w: 1080, h: 1080 },
      "3:4": { w: 810, h: 1080 }
    };
    const { w, h } = resolutions2[aspectRatio || "16:9"] || resolutions2["16:9"];
    const images = fs.readdirSync(imagesDir).filter((file) => /\.(jpg|jpeg|png|bmp)$/i.test(file)).sort().map((file) => path.join(imagesDir, file));
    if (images.length === 0) {
      reject(new Error(`No images found in ${imagesDir}`));
      return;
    }
    const hasCustomDurations = imageDurations && imageDurations.length === images.length;
    const durationPerImage = hasCustomDurations ? 0 : parseFloat((duration / images.length).toFixed(2));
    logger.log(
      `[createVideo] Processing ${images.length} images for ${duration}s video at ${w}x${h}`
    );
    const tempDir = path.join(path.dirname(outputPath), "temp_segments");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const videoSegments = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imgDuration = hasCustomDurations ? imageDurations[i] : durationPerImage;
      const segmentPath = path.join(
        tempDir,
        `segment_${i.toString().padStart(3, "0")}.mp4`
      );
      await new Promise((resolveSegment, rejectSegment) => {
        logger.log(
          `[createVideo] Creating segment ${i + 1}/${images.length}: ${imgDuration}s`
        );
        ffmpeg(img).inputOptions(["-loop", "1", "-framerate", "30"]).videoFilters([
          `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
          "format=yuv420p"
        ]).outputOptions([
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "28",
          "-t",
          `${imgDuration}`,
          "-pix_fmt",
          "yuv420p"
        ]).output(segmentPath).on("end", () => {
          videoSegments.push(segmentPath);
          resolveSegment();
        }).on("error", (err) => {
          logger.error(`[createVideo] Segment ${i} error: ${err.message}`);
          rejectSegment(err);
        }).run();
      });
    }
    logger.log(
      `[createVideo] All ${videoSegments.length} segments created. Concatenating...`
    );
    const inputListPath = path.join(
      path.dirname(outputPath),
      "segments_list.txt"
    );
    const inputListContent = videoSegments.map((seg) => `file '${seg.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(inputListPath, inputListContent);
    logger.log(`[createVideo] Segments list created`);
    let command = ffmpeg();
    command = command.input(inputListPath).inputOptions(["-f", "concat", "-safe", "0"]);
    if (audioPath && fs.existsSync(audioPath)) {
      command = command.input(audioPath);
      command.outputOptions(["-map", "0:v", "-map", "1:a"]);
      command.outputOptions(["-c:a", "aac", "-b:a", "128k", "-ac", "2"]);
    }
    command = command.outputOptions(["-c:v", "copy", "-movflags", "+faststart"]).output(normOutputPath);
    command.on("start", (commandLine) => {
      logger.log(`[createVideo] FFmpeg Concat Command: ${commandLine}`);
    });
    command.on("progress", (progress) => {
      logger.log(`[createVideo] Concat progress: ${progress.percent}% done`);
    });
    command.on("stderr", (stderrLine) => {
      logger.log(`[createVideo] Concat Stderr: ${stderrLine}`);
    });
    command.on("end", () => {
      logger.log("[createVideo] FFmpeg concat 'end' event triggered");
      if (!fs.existsSync(outputPath)) {
        const error = new Error(
          `FFmpeg claimed success but output file doesn't exist: ${outputPath}`
        );
        logger.error(`[createVideo] ${error.message}`);
        reject(error);
        return;
      }
      const fileSize = fs.statSync(outputPath).size;
      logger.log(`[createVideo] Video completed. File size: ${fileSize} bytes`);
      try {
        if (fs.existsSync(inputListPath)) fs.unlinkSync(inputListPath);
        if (fs.existsSync(tempDir)) {
          fs.readdirSync(tempDir).forEach((file) => {
            fs.unlinkSync(path.join(tempDir, file));
          });
          fs.rmdirSync(tempDir);
        }
      } catch (e) {
        logger.log(`[createVideo] Cleanup warning: ${e}`);
      }
      resolve(outputPath);
    });
    command.on("error", (err, stdout, stderr) => {
      logger.error(`[createVideo] FFmpeg Concat Error: ${err.message}`);
      logger.error(`[createVideo] Stderr: ${stderr}`);
      reject(new Error(`FFmpeg error: ${err.message}. Stderr: ${stderr}`));
    });
    logger.log("[createVideo] Starting final concat...");
    command.run();
  });
};
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(dest);
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {
      });
      reject(err);
    });
  });
};
const generateCompleteVideo = async (config) => {
  const { outputPath } = config;
  const tempBaseVideoPath = outputPath.replace(/\.mp4$/i, "_base.mp4");
  logger.log(
    `generateCompleteVideo: Iniciando pipeline completo. Destino: ${outputPath}`
  );
  logger.log(
    "generateCompleteVideo: Creando video base (imÃ¡genes + audio)..."
  );
  const baseConfig = { ...config, outputPath: tempBaseVideoPath };
  let currentVideoPath = await createVideo(baseConfig);
  if (fs.existsSync(currentVideoPath)) {
    logger.log(`DEBUG: Video base creado exitosamente: ${currentVideoPath}`);
    logger.log(
      `DEBUG: TamaÃ±o del archivo: ${fs.statSync(currentVideoPath).size} bytes`
    );
  } else {
    logger.error(
      `ERROR CRÃTICO: Video base NO fue creado: ${currentVideoPath}`
    );
  }
  logger.log(`DEBUG: Checking Avatar Config. Path: ${config.avatarPath}`);
  let localAvatarPath = config.avatarPath;
  let tempAvatarPath = "";
  if (config.avatarPath && config.avatarPath.startsWith("http")) {
    try {
      logger.log(`DEBUG: Downloading avatar from URL: ${config.avatarPath}`);
      const ext = path.extname(config.avatarPath) || ".png";
      tempAvatarPath = path.join(
        path.dirname(outputPath),
        `temp_avatar_${Date.now()}${ext}`
      );
      await downloadFile(config.avatarPath, tempAvatarPath);
      localAvatarPath = tempAvatarPath;
      logger.log(`DEBUG: Avatar downloaded to: ${localAvatarPath}`);
    } catch (error) {
      logger.error(`DEBUG: Failed to download avatar: ${error.message}`);
      localAvatarPath = void 0;
    }
  }
  if (localAvatarPath && fs.existsSync(localAvatarPath)) {
    logger.log("generateCompleteVideo: Aplicando Avatar Overlay...");
    const avatarConfig = {
      path: localAvatarPath,
      position: config.avatarPosition || "bottom-right",
      // Normalize size: if > 1, assume it's a percentage (e.g. 20 -> 0.2)
      size: config.avatarSize && config.avatarSize > 1 ? config.avatarSize / 100 : config.avatarSize || 0.3,
      chromaKey: config.avatarChromaKey,
      duration: config.duration,
      // Pass total duration for trimming
      muteAudio: config.avatarMuteAudio !== false
      // Default to true (mute)
    };
    try {
      const videoWithAvatar = await addAvatarOverlay(
        currentVideoPath,
        avatarConfig
      );
      if (currentVideoPath !== videoWithAvatar && fs.existsSync(currentVideoPath)) {
        fs.unlinkSync(currentVideoPath);
      }
      currentVideoPath = videoWithAvatar;
    } catch (error) {
      logger.error(
        `generateCompleteVideo: Error aplicando avatar: ${error.message}`
      );
    } finally {
      if (tempAvatarPath && fs.existsSync(tempAvatarPath)) {
        fs.unlinkSync(tempAvatarPath);
      }
    }
  }
  if (config.subtitles && config.subtitles.length > 0 && config.subtitleStyle) {
    const wordsPerLine = config.subtitleStyle.wordsPerLine || 1;
    const linesPerSubtitle = config.subtitleStyle.linesPerSubtitle || 1;
    const grouped = groupSubtitles(
      config.subtitles,
      wordsPerLine,
      linesPerSubtitle,
      {
        useGeneralStyle: config.subtitleStyle?.useGeneralStyle ?? true,
        fontFamily: config.subtitleStyle?.fontFamily || "Arial",
        subtitleColor: config.subtitleStyle?.color || "#FFFF00",
        fontSize: config.subtitleStyle?.fontSize || 48,
        fontWeight: config.subtitleStyle?.fontWeight || "bold",
        borderWidth: config.subtitleStyle?.borderWidth || "medium",
        borderColor: config.subtitleStyle?.borderColor || "#000000",
        subtitleTextAlign: config.subtitleStyle?.subtitleTextAlign || "center",
        subtitlePosition: config.subtitleStyle?.position || "bottom-center",
        lineStyles: config.subtitleStyle?.lineStyles || [],
        videoHeight: resolutions[config.aspectRatio || "16:9"].h,
        videoWidth: resolutions[config.aspectRatio || "16:9"].w,
        marginL: config.subtitleStyle?.marginL,
        marginR: config.subtitleStyle?.marginR,
        marginT: config.subtitleStyle?.marginT,
        marginB: config.subtitleStyle?.marginB
      }
    );
    logger.log(
      `generateCompleteVideo: Aplicando ${grouped.length} bloques de subtÃ­tulos (Words/Line: ${wordsPerLine})...`
    );
    if (fs.existsSync(currentVideoPath)) {
      logger.log(`DEBUG: Video para subtÃ­tulos existe: ${currentVideoPath}`);
    } else {
      logger.error(
        `ERROR CRÃTICO: Video para subtÃ­tulos NO existe: ${currentVideoPath}`
      );
    }
    const videoWithSubs = await addSubtitlesToVideo({
      videoPath: currentVideoPath,
      subtitles: grouped,
      style: config.subtitleStyle,
      outputPath
      // Ensure it outputs to the final path
    });
    if (fs.existsSync(currentVideoPath)) {
      fs.unlinkSync(currentVideoPath);
    }
    return videoWithSubs;
  }
  if (fs.existsSync(currentVideoPath) && currentVideoPath !== outputPath) {
    fs.renameSync(currentVideoPath, outputPath);
  }
  return outputPath;
};
dotenv.config();
const genAI = new genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const generateContentWithRetry = async (model, contents, config, onRetry) => {
  let attempt = 0;
  const maxRetries = 5;
  let delay = 2e3;
  while (attempt < maxRetries) {
    try {
      return await genAI.models.generateContent({
        model,
        contents,
        config
      });
    } catch (error) {
      const isQuotaError = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429 || error.code === 429;
      if (isQuotaError) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        if (onRetry) onRetry(attempt, delay);
        console.log(
          `Gemini API quota exceeded. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
};
const generateVideoContent = async (theme, duration, outputDir, onProgress, useMock = false) => {
  if (useMock) {
    if (onProgress) onProgress("Modo Prueba: Cargando datos simulados...");
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const mockPath = path.join(__dirname, "mock_response.json");
    let mockData;
    if (fs.existsSync(mockPath)) {
      mockData = JSON.parse(fs.readFileSync(mockPath, "utf-8"));
    } else {
      mockData = {
        guion_mejorado: "Escuché un rasguño bajo mi cama. Bajé la mano para calmar a mi perro. Unas manos frías la sujetaron. Mi perro estaba rascando la puerta del pasillo.",
        escenas: [
          {
            texto: "Escuché un rasguño bajo mi cama.",
            descripcion_visual: "Cinematic horror scene, dark bedroom at night, a pale demonic hand reaching from under the bed"
          },
          {
            texto: "Bajé la mano para calmar a mi perro.",
            descripcion_visual: "A person lowering their hand towards the floor in a dark room"
          },
          {
            texto: "Unas manos frías la sujetaron.",
            descripcion_visual: "Pale cold hands grabbing a human hand under a bed"
          },
          {
            texto: "Mi perro estaba rascando la puerta del pasillo.",
            descripcion_visual: "A dog scratching a door in a dimly lit hallway"
          }
        ]
      };
    }
    const imagePrompts = mockData.escenas.map(
      (escena) => `MOCK PROMPT: ${escena.descripcion_visual}`
    );
    const generatedImages = [];
    for (let i = 0; i < imagePrompts.length; i++) {
      const imagePath = path.join(outputDir, `imagen-escena-${i + 1}.txt`);
      fs.writeFileSync(imagePath, imagePrompts[i]);
      generatedImages.push(imagePath);
    }
    return {
      guion_mejorado: mockData.guion_mejorado,
      prompts_imagen: imagePrompts,
      imagenes_generadas: generatedImages,
      duracion_estimada: `${duration} segundos`,
      escenas: mockData.escenas || []
    };
  }
  const scriptPrompt = `
    Crea un guion viral de exactamente ${duration} segundos sobre: "${theme}".
    
    El guion debe ser:
    - Enganchador desde el primer segundo
    - Perfecto para video corto estilo TikTok/Reels
    - Con estructura clara: Gancho → Desarrollo → Cierre con CTA
    - Dividido en ${Math.ceil(duration / 5)} escenas (aproximadamente 5 segundos por escena)
    
    Responde en formato JSON:
    {
      "guion_mejorado": "texto completo del guion",
      "escenas": [
        {
          "texto": "texto de la escena",
          "descripcion_visual": "descripción detallada para generar imagen"
        }
      ]
    }
  `;
  try {
    const response = await generateContentWithRetry(
      "gemini-3-flash-preview",
      scriptPrompt,
      { responseMimeType: "application/json" },
      (attempt, delay) => {
        if (onProgress) {
          onProgress(
            `Esperando cuota API... (${attempt}/5) - ${delay / 1e3}s`
          );
        }
      }
    );
    const scriptText = response.text || "{}";
    const cleanJson = scriptText.replace(/```json\n?|\n?```/g, "").trim();
    const scriptData = JSON.parse(cleanJson);
    if (onProgress) onProgress("Pausando para respetar límites de API...");
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    const imagePrompts = scriptData.escenas.map(
      (escena) => `Imagen fotorrealista de alta calidad: ${escena.descripcion_visual}. Estilo cinematográfico, iluminación profesional, 4K.`
    );
    const generatedImages = [];
    for (let i = 0; i < imagePrompts.length; i++) {
      const imagePath = path.join(outputDir, `imagen-escena-${i + 1}.txt`);
      fs.writeFileSync(imagePath, imagePrompts[i]);
      generatedImages.push(imagePath);
    }
    return {
      guion_mejorado: scriptData.guion_mejorado,
      prompts_imagen: imagePrompts,
      imagenes_generadas: generatedImages,
      duracion_estimada: `${duration} segundos`,
      escenas: scriptData.escenas || []
    };
  } catch (error) {
    console.error("Error generating video content:", error);
    throw error;
  }
};
const analyzeTrend = async (text, onProgress) => {
  const prompt = `
    Analiza el siguiente tema y genera:
    1. Un guion mejorado y más enganchador
    2. 3 prompts para generación de imágenes que describan visualmente el contenido
    
    Responde ÚNICAMENTE en formato JSON:
    {
      "guion_mejorado": "texto del guion",
      "prompts_imagen": ["prompt 1", "prompt 2", "prompt 3"]
    }

    Tema: ${text}
  `;
  try {
    const response = await generateContentWithRetry(
      "gemini-3-flash-preview",
      prompt,
      { responseMimeType: "application/json" },
      (attempt, delay) => {
        if (onProgress) {
          onProgress(
            `Esperando cuota API... (${attempt}/5) - ${delay / 1e3}s`
          );
        }
      }
    );
    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    return { guion_mejorado: text, prompts_imagen: [] };
  }
};
try {
  configureFfmpeg();
} catch (error) {
  console.error("Failed to configure FFmpeg:", error);
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  console.log("BUILD CHECK: VERSION 5 - RESTORED");
  try {
    await killFfmpegProcesses();
  } catch (error) {
    console.log("No FFmpeg processes to kill or error during cleanup.");
  }
  utils.electronApp.setAppUserModelId("com.video-remaker");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.ipcMain.handle("dialog:openFile", async (_, options) => {
    return await electron.dialog.showOpenDialog(options);
  });
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("will-quit", async () => {
  try {
    await killFfmpegProcesses();
  } catch (error) {
  }
});
electron.ipcMain.handle("download-tiktok", async (_, url) => {
  return await downloadTikTokAudio(url);
});
electron.ipcMain.handle("generate-voice", async (_, text, voice, outputPath) => {
  return await generateVoice(text, voice, outputPath);
});
electron.ipcMain.handle("analyze-trend", async (event, text) => {
  return await analyzeTrend(text, (msg) => {
    if (event && event.sender) {
      event.sender.send("video-progress", { step: msg, progress: 5 });
    }
  });
});
electron.ipcMain.handle("create-video", async (_, config) => {
  return await createVideo(config);
});
electron.ipcMain.handle("generate-complete-video", async (event, params) => {
  const {
    theme,
    duration,
    voiceGender,
    subtitleColor,
    fontSize,
    aspectRatio = "16:9",
    useMock = false,
    avatarPath,
    avatarPosition,
    avatarSize,
    avatarChromaKey,
    avatarMuteAudio,
    borderWidth,
    borderColor,
    subtitlePosition,
    subtitleTextAlign,
    linesPerSubtitle,
    wordsPerLine,
    fontWeight,
    fontFamily,
    useGeneralStyle,
    lineStyles,
    marginL,
    marginR,
    marginT,
    marginB
  } = params;
  console.log(
    "DEBUG: Received params in generate-complete-video:",
    JSON.stringify(params, null, 2)
  );
  logger.log(`DEBUG: Avatar Path received: ${avatarPath}`);
  logger.log(`DEBUG: Avatar Position: ${avatarPosition}`);
  logger.log(`DEBUG: Avatar Size: ${avatarSize}`);
  const resolutions2 = {
    "16:9": { w: 1920, h: 1080 },
    "9:16": { w: 1080, h: 1920 },
    "1:1": { w: 1080, h: 1080 },
    "3:4": { w: 810, h: 1080 }
  };
  const { w, h } = resolutions2[aspectRatio] || resolutions2["16:9"];
  try {
    const baseOutputDir = "C:/videos-ia";
    if (!fs.existsSync(baseOutputDir)) {
      fs.mkdirSync(baseOutputDir, { recursive: true });
    }
    const now = /* @__PURE__ */ new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    const timestamp = `${YYYY}${MM}${DD}_${hh}${mm}${ss}_${ms}`;
    const sanitizedTheme = (theme || "video").substring(0, 30).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const projectFolderName = `${timestamp}-${sanitizedTheme}`;
    const projectDir = path.join(baseOutputDir, projectFolderName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    logger.setProjectDir(projectDir);
    logger.log(`Proyecto iniciado: ${projectFolderName}`);
    logger.log(
      `Tema: ${theme}, Duración: ${duration}s, Formato: ${aspectRatio}`
    );
    const imagesDir = path.join(projectDir, "imagenes");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const audioPath = path.join(projectDir, "audio.mp3");
    const outputPath = path.join(projectDir, "video-generado.mp4");
    const jsonPath = path.join(projectDir, "datos-video.json");
    const { manualScript, manualImages } = params;
    let content;
    if (manualScript && manualImages && manualImages.length > 0) {
      logger.log(
        "Modo Manual detectado. Usando guion e imágenes proporcionados."
      );
      event.sender.send("video-progress", {
        step: "Procesando recursos manuales...",
        progress: 10
      });
      content = {
        guion_mejorado: manualScript,
        prompts_imagen: manualImages.map(
          (_, i) => `Manual Image ${i + 1}`
        )
      };
      logger.log(
        `Procesando y convirtiendo ${manualImages.length} imágenes manuales...`
      );
      for (let i = 0; i < manualImages.length; i++) {
        const imgSrc = manualImages[i];
        const paddedIndex = String(i + 1).padStart(2, "0");
        const destPath = path.join(
          imagesDir,
          `imagen-escena-${paddedIndex}.bmp`
          // Force BMP extension
        );
        try {
          await convertImageToBmp(imgSrc, destPath);
          logger.log(`Imagen ${i + 1} convertida: ${destPath}`);
        } catch (err) {
          logger.error(`Error convirtiendo imagen ${imgSrc}: ${err.message}`);
          throw new Error(
            `Error al procesar la imagen ${path.basename(imgSrc)}. Asegúrate de que sea un archivo de imagen válido.`
          );
        }
      }
    } else {
      event.sender.send("video-progress", {
        step: "Generando escenas con Gemini AI...",
        progress: 10
      });
      logger.log("Iniciando generación de contenido con Gemini AI...");
      content = await generateVideoContent(
        theme,
        duration,
        imagesDir,
        (msg) => {
          event.sender.send("video-progress", {
            step: msg,
            progress: 10
          });
        },
        useMock
      );
    }
    fs.writeFileSync(jsonPath, JSON.stringify(content, null, 2));
    event.sender.send("video-progress", {
      step: "Generando voz con IA...",
      progress: 20
    });
    logger.log(`Generando voz (${voiceGender})...`);
    const voiceMap = {
      male: "es-MX-JorgeNeural",
      female: "es-MX-DaliaNeural"
    };
    const voiceName = voiceMap[voiceGender] || "es-MX-DaliaNeural";
    let wordTimingsPath = "";
    try {
      const voiceResult = await generateVoice(
        content.guion_mejorado,
        voiceName,
        audioPath
      );
      wordTimingsPath = voiceResult.jsonPath;
    } catch (err) {
      logger.error(`[CRITICAL] Voice generation failed: ${err}`);
    }
    const audioDuration = await getAudioDuration(audioPath);
    logger.log(`Audio generado. Duración: ${audioDuration}s`);
    const videoDuration = audioDuration || duration;
    let imageDurations = [];
    try {
      if (fs.existsSync(wordTimingsPath)) {
        const wordTimings = JSON.parse(
          fs.readFileSync(wordTimingsPath, "utf-8")
        );
        let scenesText = [];
        if (manualScript && manualImages && manualImages.length > 0) {
          scenesText = manualScript.split(/\n\n+/).filter((s) => s.trim().length > 0);
          if (scenesText.length !== manualImages.length) {
            scenesText = manualScript.split(/\n+/).filter((s) => s.trim().length > 0);
          }
        } else {
          scenesText = content.escenas?.map((e) => e.texto) || [];
        }
        if (manualScript && manualImages && scenesText.length !== manualImages.length) {
          logger.log(
            `[SceneSync] Mismatch: ${scenesText.length} scenes vs ${manualImages.length} images. Forcing Equal Distribution.`
          );
          imageDurations = [];
        } else if (scenesText.length > 0) {
          const fullScriptClean = scenesText.join("");
          const totalChars = fullScriptClean.length;
          if (totalChars > 0 && audioDuration) {
            imageDurations = scenesText.map((scene) => {
              const ratio = scene.length / totalChars;
              return parseFloat((ratio * audioDuration).toFixed(2));
            });
            if (imageDurations.length > 0) {
              const currentTotal = imageDurations.reduce((a, b) => a + b, 0);
              const diff = audioDuration - currentTotal;
              imageDurations[imageDurations.length - 1] += diff;
            }
            logger.log(
              `[SceneSync] Durations calculated by CharRatio: ${JSON.stringify(imageDurations)}`
            );
          }
        }
      }
    } catch (e) {
      logger.error(`[SceneSync] Error calculating scene durations: ${e}`);
    }
    if (!manualImages) {
      event.sender.send("video-progress", {
        step: "Creando imágenes de las escenas...",
        progress: 40
      });
      logger.log(
        `Creando ${content.prompts_imagen.length} imágenes de escena...`
      );
      for (let i = 0; i < content.prompts_imagen.length; i++) {
        const imagePath = path.join(imagesDir, `imagen-escena-${i + 1}.bmp`);
        await createPlaceholderImage(imagePath, `Scene ${i + 1}`, w, h);
      }
    } else {
      logger.log("Modo Manual: Saltando generación de imágenes placeholder.");
    }
    event.sender.send("video-progress", {
      step: "Renderizando video con audio y subtítulos...",
      progress: 70
    });
    logger.log("Iniciando renderizado final del video...");
    const videoConfig = {
      imagesDir,
      audioPath,
      // Audio re-enabled
      outputPath,
      duration: videoDuration,
      aspectRatio,
      imageDurations,
      // Pass calculated durations
      avatarPath,
      avatarPosition,
      avatarSize,
      avatarChromaKey,
      avatarMuteAudio,
      subtitleStyle: {
        color: subtitleColor,
        fontSize,
        wordsPerLine: params.wordsPerLine,
        linesPerSubtitle,
        borderWidth: borderWidth || "medium",
        borderColor: borderColor || "#000000",
        position: subtitlePosition,
        subtitleTextAlign,
        useGeneralStyle: params.useGeneralStyle,
        fontFamily: params.fontFamily,
        fontWeight: params.fontWeight,
        lineStyles: params.lineStyles,
        marginL,
        marginR,
        marginT,
        marginB
      },
      subtitles: generateSubtitles(
        content.guion_mejorado,
        videoDuration,
        wordTimingsPath
        // Use the generated JSON for exact word sync
      )
    };
    logger.log(
      `Subtítulos generados: ${videoConfig.subtitles.length} palabras encontradas.`
    );
    await generateCompleteVideo(videoConfig);
    event.sender.send("video-progress", {
      step: "¡Video completado con éxito!",
      progress: 100
    });
    logger.log("¡Proceso completado con éxito!");
    logger.save();
    return {
      success: true,
      videoPath: outputPath,
      script: content.guion_mejorado
    };
  } catch (error) {
    console.error("Error generating video:", error);
    event.sender.send("video-progress", {
      step: `Error: ${error.message}`,
      progress: 0
    });
    logger.error("Error en el proceso de generación", error);
    logger.save();
    throw error;
  }
});
