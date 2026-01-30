import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "../utils/logger";
import { addSubtitlesToVideo } from "./subtitleService";
import {
  downloadTikTokAudio,
  getAudioDuration,
  trimAudio,
} from "../utils/audioUtils";
import { generateSubtitles, groupSubtitles } from "../utils/subtitleParser";
import { generateVoice } from "../utils/ttsUtils";
import { createPlaceholderImage, convertImageToBmp } from "../utils/imageUtils";
import { killFfmpegProcesses } from "../utils/ffmpegUtils";
import { addAvatarOverlay } from "../utils/avatarUtils";

// Re-export functions that were moved to utils to maintain API compatibility if needed elsewhere
export {
  downloadTikTokAudio,
  getAudioDuration,
  trimAudio,
  generateSubtitles,
  createPlaceholderImage,
  killFfmpegProcesses,
  generateVoice,
  addAvatarOverlay,
  convertImageToBmp,
};

const resolutions = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "3:4": { w: 810, h: 1080 },
};

export interface VideoConfig {
  imagesDir: string;
  audioPath: string;
  outputPath: string;
  duration: number;
  framePath?: string;
  avatarPath?: string;
  avatarPosition?: string;
  avatarSize?: number;
  avatarChromaKey?: string;
  avatarMuteAudio?: boolean; // New field
  subtitleStyle?: {
    color: string;
    fontSize: number;
    style?: string;
    wordsPerLine?: number;
    linesPerSubtitle?: number;
    position?: string;
    useGeneralStyle?: boolean;
    fontFamily?: string;
    fontWeight?: string;
    lineStyles?: any[];
  };
  subtitles?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "3:4";
  imageDurations?: number[];
}

export const createVideo = (config: VideoConfig): Promise<string> => {
  return new Promise((resolve, reject) => {
    const {
      imagesDir,
      audioPath,
      outputPath,
      duration,
      aspectRatio = "16:9",
    } = config;

    // Normalize paths to use forward slashes for FFmpeg compatibility
    const normOutputPath = outputPath;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Define resolutions based on aspect ratio
    const resolutions = {
      "16:9": { w: 1920, h: 1080 },
      "9:16": { w: 1080, h: 1920 },
      "1:1": { w: 1080, h: 1080 },
      "3:4": { w: 810, h: 1080 },
    };
    const { w, h } = resolutions[aspectRatio] || resolutions["16:9"];

    // Get all images from directory (supporting png, bmp, jpg)
    const images = fs
      .readdirSync(imagesDir)
      .filter((file) => /\.(jpg|jpeg|png|bmp)$/i.test(file))
      .map((file) => path.join(imagesDir, file))
      .sort();

    if (images.length === 0) {
      return reject(new Error("No images found in directory"));
    }

    // Calculate duration per image
    const durationPerImage = duration / images.length;
    const hasCustomDurations =
      config.imageDurations && config.imageDurations.length === images.length;

    console.log(
      `[VideoService] Mode: ${hasCustomDurations ? "Custom Scene Durations" : "Equal Distribution"}`,
    );
    if (hasCustomDurations) {
      console.log(
        `[VideoService] Durations: ${JSON.stringify(config.imageDurations)}`,
      );
    }

    // Create input file list for ffmpeg
    const inputListPath = path.join(path.dirname(outputPath), "input_list.txt");
    let inputListContent = images
      .map((img, index) => {
        const imgDuration = hasCustomDurations
          ? config.imageDurations![index]
          : durationPerImage;
        return `file '${img.replace(/\\/g, "/")}'
duration ${imgDuration}`;
      })
      .join("\n");

    // Fix: Repeat the last image without duration to ensure the last segment plays fully
    if (images.length > 0) {
      const lastImage = images[images.length - 1];
      inputListContent += `
file '${lastImage.replace(/\\/g, "/")}'`;
    }

    fs.writeFileSync(inputListPath, inputListContent);

    // DEBUG: Log the exact content of the input list
    logger.log(`[createVideo] Input list path: ${inputListPath}`);
    logger.log(`[createVideo] Input list content:\n${inputListContent}`);

    // Build ffmpeg command
    let command = ffmpeg();

    // Input: concat images
    command = command
      .input(inputListPath)
      .inputOptions(["-f", "concat", "-safe", "0"]);

    if (audioPath && fs.existsSync(audioPath)) {
      command = command.input(audioPath);
      // Explicitly map streams to ensure audio is included
      // Map 0:v (video from images) and 1:a (audio from file)
      command.outputOptions(["-map", "0:v", "-map", "1:a"]);
      // Ensure audio codec is set to AAC as per specs, and fix sync issues with async resampling
      command.outputOptions([
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2", // Force stereo
      ]);
    }

    const videoFilters = [
      // Simple scale and format, no complex zoompan
      `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
      "fps=fps=30",
      "format=yuv420p",
    ];

    command.videoFilters(videoFilters);

    // Output settings
    command = command
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-r", // Force constant frame rate
        "30", // 30 fps
        "-pix_fmt", // Ensure compatible pixel format
        "yuv420p",
        "-t",
        `${duration}`, // Force exact duration
      ])
      .output(normOutputPath);

    // Handle events
    command.on("start", (commandLine) => {
      logger.log(`[createVideo] FFmpeg Command: ${commandLine}`);
    });

    command.on("progress", (progress) => {
      logger.log(`[createVideo] Processing: ${progress.percent}% done`);
    });

    command.on("stderr", (stderrLine) => {
      logger.log(`[createVideo] FFmpeg Stderr: ${stderrLine}`);
    });

    command.on("end", () => {
      logger.log("[createVideo] FFmpeg 'end' event triggered");
      // CRITICAL: Verify the file actually exists before resolving
      if (!fs.existsSync(outputPath)) {
        const error = new Error(
          `FFmpeg claimed success but output file doesn't exist: ${outputPath}`,
        );
        logger.error(`[createVideo] ${error.message}`);
        reject(error);
        return;
      }

      const fileSize = fs.statSync(outputPath).size;
      logger.log(
        `[createVideo] Video creation completed successfully. File size: ${fileSize} bytes`,
      );

      // Clean up temp files
      if (fs.existsSync(inputListPath)) {
        fs.unlinkSync(inputListPath);
      }
      resolve(outputPath);
    });

    command.on("error", (err, stdout, stderr) => {
      logger.error(`[createVideo] FFmpeg Error: ${err.message}`);
      logger.error(`[createVideo] FFmpeg Stderr: ${stderr}`);
      reject(new Error(`FFmpeg error: ${err.message}. Stderr: ${stderr}`));
    });

    // Run the command
    logger.log("[createVideo] Starting FFmpeg execution...");
    command.run();
  });
};

import https from "https";

// Helper to download file
const downloadFile = (url: string, dest: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(dest);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {}); // Delete the file async. (But we don't check result)
        reject(err);
      });
  });
};

/**
 * Wrapper function to handle the full video generation pipeline:
 * 1. Create base video (Images only)
 * 2. Add Avatar Overlay (Optional)
 * 3. Add subtitles (Post-processing)
 */
export const generateCompleteVideo = async (
  config: VideoConfig,
): Promise<string> => {
  const { outputPath } = config;
  const tempBaseVideoPath = outputPath.replace(/\.mp4$/i, "_base.mp4");

  logger.log(
    `generateCompleteVideo: Iniciando pipeline completo. Destino: ${outputPath}`,
  );

  // 1. Create base video (Images + Audio)
  logger.log("generateCompleteVideo: Creando video base (imágenes + audio)...");
  const baseConfig = { ...config, outputPath: tempBaseVideoPath };
  let currentVideoPath = await createVideo(baseConfig);

  // DEBUG: Verify base video was created
  if (fs.existsSync(currentVideoPath)) {
    logger.log(`DEBUG: Video base creado exitosamente: ${currentVideoPath}`);
    logger.log(
      `DEBUG: Tamaño del archivo: ${fs.statSync(currentVideoPath).size} bytes`,
    );
  } else {
    logger.error(
      `ERROR CRÍTICO: Video base NO fue creado: ${currentVideoPath}`,
    );
  }

  // 2. Add Avatar Overlay if configured
  logger.log(`DEBUG: Checking Avatar Config. Path: ${config.avatarPath}`);

  let localAvatarPath = config.avatarPath;
  let tempAvatarPath = "";

  // Handle URL avatar
  if (config.avatarPath && config.avatarPath.startsWith("http")) {
    try {
      logger.log(`DEBUG: Downloading avatar from URL: ${config.avatarPath}`);
      const ext = path.extname(config.avatarPath) || ".png"; // Default to png if no extension
      tempAvatarPath = path.join(
        path.dirname(outputPath),
        `temp_avatar_${Date.now()}${ext}`,
      );
      await downloadFile(config.avatarPath, tempAvatarPath);
      localAvatarPath = tempAvatarPath;
      logger.log(`DEBUG: Avatar downloaded to: ${localAvatarPath}`);
    } catch (error: any) {
      logger.error(`DEBUG: Failed to download avatar: ${error.message}`);
      localAvatarPath = undefined;
    }
  }

  if (localAvatarPath && fs.existsSync(localAvatarPath)) {
    logger.log("generateCompleteVideo: Aplicando Avatar Overlay...");
    const avatarConfig = {
      path: localAvatarPath,
      position: (config.avatarPosition as any) || "bottom-right",
      // Normalize size: if > 1, assume it's a percentage (e.g. 20 -> 0.2)
      size:
        config.avatarSize && config.avatarSize > 1
          ? config.avatarSize / 100
          : config.avatarSize || 0.3,
      chromaKey: config.avatarChromaKey,
      duration: config.duration, // Pass total duration for trimming
      muteAudio: config.avatarMuteAudio !== false, // Default to true (mute)
    };

    try {
      const videoWithAvatar = await addAvatarOverlay(
        currentVideoPath,
        avatarConfig,
      );

      // Clean up previous step
      if (
        currentVideoPath !== videoWithAvatar &&
        fs.existsSync(currentVideoPath)
      ) {
        fs.unlinkSync(currentVideoPath);
      }
      currentVideoPath = videoWithAvatar;
    } catch (error: any) {
      logger.error(
        `generateCompleteVideo: Error aplicando avatar: ${error.message}`,
      );
      // Continue without avatar if it fails
    } finally {
      // Clean up temp avatar file if it was downloaded
      if (tempAvatarPath && fs.existsSync(tempAvatarPath)) {
        fs.unlinkSync(tempAvatarPath);
      }
    }
  }

  // 3. Add subtitles if enabled
  if (config.subtitles && config.subtitles.length > 0 && config.subtitleStyle) {
    // Apply word grouping if configured
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
        subtitleStyleType: config.subtitleStyle?.style || "outline",
        subtitleTextAlign:
          (config.subtitleStyle as any)?.subtitleTextAlign || "center",
        lineStyles: config.subtitleStyle?.lineStyles || [],
        videoHeight: resolutions[config.aspectRatio || "16:9"].h,
        videoWidth: resolutions[config.aspectRatio || "16:9"].w,
      },
    );

    logger.log(
      `generateCompleteVideo: Aplicando ${grouped.length} bloques de subtítulos (Words/Line: ${wordsPerLine})...`,
    );

    // DEBUG: Verify video exists before adding subtitles
    if (fs.existsSync(currentVideoPath)) {
      logger.log(`DEBUG: Video para subtítulos existe: ${currentVideoPath}`);
    } else {
      logger.error(
        `ERROR CRÍTICO: Video para subtítulos NO existe: ${currentVideoPath}`,
      );
    }

    const videoWithSubs = await addSubtitlesToVideo({
      videoPath: currentVideoPath,
      subtitles: grouped,
      style: config.subtitleStyle,
      outputPath: outputPath, // Ensure it outputs to the final path
    });

    // Clean up intermediate video
    if (fs.existsSync(currentVideoPath)) {
      fs.unlinkSync(currentVideoPath);
    }

    return videoWithSubs;
  }

  // If no subtitles, move current video to final output path
  if (fs.existsSync(currentVideoPath) && currentVideoPath !== outputPath) {
    fs.renameSync(currentVideoPath, outputPath);
  }

  return outputPath;
};
