import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "../utils/logger";
import { generateAssContent } from "../utils/subtitleParser";

// Ensure FFmpeg is configured
// configureFfmpeg(); // Moved to index.ts

export interface SubtitleConfig {
  videoPath: string;
  subtitles: Array<{ start: number; end: number; text: string }>;
  style: any;
  outputPath?: string;
}

/**
 * Maps subtitle position string to FFmpeg Alignment value (ASS format)
 */
const getAlignment = (
  position: string,
  textAlign: string = "center",
): number => {
  logger.log(
    `[getAlignment] Input - Position: ${position}, TextAlign: ${textAlign}`,
  );
  // Use Modern ASS Alignment mapping (1-9)
  // 1, 2, 3 (Bottom)
  // 4, 5, 6 (Middle)
  // 7, 8, 9 (Top)

  const posBase = position.split("-")[0]; // top, middle, bottom
  const align = textAlign.toLowerCase(); // left, center, right

  let result = 2; // Default bottom center
  if (posBase === "top") {
    if (align === "left") result = 7;
    else if (align === "right") result = 9;
    else result = 8;
  } else if (posBase === "middle") {
    if (align === "left") result = 4;
    else if (align === "right") result = 6;
    else result = 5;
  } else {
    // bottom
    if (align === "left") result = 1;
    else if (align === "right") result = 3;
    else result = 2;
  }

  logger.log(`[getAlignment] Output: ${result}`);
  return result;
};

/**
 * Adds subtitles to an existing video file using FFmpeg.
 * This is a post-processing step that runs after the main video generation.
 */
export const addSubtitlesToVideo = (
  config: SubtitleConfig,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { videoPath, subtitles, style, outputPath } = config;

    if (!subtitles || subtitles.length === 0) {
      logger.log("[addSubtitlesToVideo] No hay subtítulos para procesar.");
      return resolve(videoPath);
    }
    logger.log(
      `[addSubtitlesToVideo] Iniciando proceso para ${subtitles.length} subtítulos.`,
    );

    // Normalize paths
    // REVERTED: Using standard backslashes for Windows compatibility
    const normVideoPath = videoPath;
    const projectTempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(projectTempDir)) {
      fs.mkdirSync(projectTempDir, { recursive: true });
    }

    const tempFileName = `video_subs_temp_${Date.now()}.mp4`;
    const tempOutputPath = path.join(projectTempDir, tempFileName);

    const outputDir = path.dirname(videoPath);
    const finalOutputPath =
      outputPath || path.join(outputDir, `video_subs_${Date.now()}.mp4`);

    // Get video dimensions to calculate subtitle sizing
    ffmpeg.ffprobe(normVideoPath, (err, metadata) => {
      if (err) {
        logger.error(
          `[addSubtitlesToVideo] Error al analizar video: ${err.message}`,
        );
        return reject(
          new Error(`Failed to probe video for subtitles: ${err.message}`),
        );
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;

      // Generate ASS file content
      const alignment = getAlignment(
        style.position || "bottom-center",
        style.subtitleTextAlign || "center",
      );

      const assContent = generateAssContent(subtitles, {
        fontFamily: style.fontFamily || "Arial",
        fontSize: style.fontSize || style.size || 48,
        fontWeight: style.fontWeight || "bold",
        videoWidth: width,
        videoHeight: height,
        alignment,
      });

      const assPath = path.join(
        path.dirname(finalOutputPath),
        `subtitles_${Date.now()}.ass`,
      );

      logger.log(
        `[addSubtitlesToVideo] Escribiendo archivo ASS en: ${assPath}`,
      );
      fs.writeFileSync(assPath, assContent, "utf-8");

      // Use absolute path with proper escaping for FFmpeg filter
      const escapedAssPath = assPath.replace(/\\/g, "/").replace(":", "\\:");

      // Construct the simple filter string
      const filterString = `subtitles=filename='${escapedAssPath}'`;

      logger.log(
        `[addSubtitlesToVideo] Iniciando FFmpeg para quemar subtítulos...`,
      );
      logger.log(`[addSubtitlesToVideo] Filtro: ${filterString}`);

      const ffmpegCmd = ffmpeg(normVideoPath)
        .outputOptions([
          "-vf",
          filterString,
          "-c:v",
          "libx264",
          "-preset",
          "slow",
          "-crf",
          "14",
          "-c:a",
          "copy",
        ])
        .output(tempOutputPath)
        .on("start", (commandLine) => {
          logger.log(`[addSubtitlesToVideo] FFmpeg iniciado.`);
          logger.log(`[addSubtitlesToVideo] COMANDO EXACTO: ${commandLine}`);
        })
        .on("end", () => {
          logger.log("[addSubtitlesToVideo] FFmpeg finalizado con éxito.");
          try {
            if (!fs.existsSync(path.dirname(finalOutputPath))) {
              fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
            }
            fs.copyFileSync(tempOutputPath, finalOutputPath);
            fs.unlinkSync(tempOutputPath);
            // We keep the .srt file as requested by the user
            logger.log(
              `[addSubtitlesToVideo] Video finalizado en: ${finalOutputPath}`,
            );
            resolve(finalOutputPath);
          } catch (e: any) {
            reject(new Error(`Failed to move final video: ${e.message}`));
          }
        })
        .on("error", (err, stdout, stderr) => {
          logger.error(`[addSubtitlesToVideo] Error en FFmpeg: ${err.message}`);
          if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
          reject(
            new Error(
              `Failed to burn subtitles: ${err.message}. Stderr: ${stderr}`,
            ),
          );
        });

      ffmpegCmd.run();
    });
  });
};
