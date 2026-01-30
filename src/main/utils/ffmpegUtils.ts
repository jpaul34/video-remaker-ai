import path from "path";
import fs from "fs";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import { app } from "electron";

/**
 * Resolves the path to the FFmpeg executable.
 * Checks common locations including resources directory and system path.
 */
export const getFfmpegPath = (): string => {
  const possiblePaths = [
    path.join(process.cwd(), "resources", "ffmpeg.exe"),
    path.join(process.cwd(), "resources", "ffmpeg"),
    path.join(__dirname, "../../resources/ffmpeg.exe"), // For dev/prod structure
    path.join(process.cwd(), "ffmpeg.exe"),
    "ffmpeg",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "ffmpeg"; // Fallback to system path
};

/**
 * Resolves the path to the FFprobe executable.
 * Checks common locations including resources directory and system path.
 */
export const getFfprobePath = (): string => {
  const possiblePaths = [
    path.join(process.cwd(), "resources", "ffprobe.exe"),
    path.join(process.cwd(), "resources", "ffprobe"),
    path.join(__dirname, "../../resources/ffprobe.exe"), // For dev/prod structure
    path.join(process.cwd(), "ffprobe.exe"),
    "ffprobe",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "ffprobe"; // Fallback to system path
};

/**
 * Configures fluent-ffmpeg with resolved paths.
 * Should be called before using ffmpeg.
 */
export const configureFfmpeg = (): void => {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();

  console.log(`Configuring FFmpeg: ${ffmpegPath}`);
  console.log(`Configuring FFprobe: ${ffprobePath}`);

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
};

export const killFfmpegProcesses = (): Promise<void> => {
  return new Promise((resolve) => {
    const command =
      process.platform === "win32"
        ? "taskkill /F /IM ffmpeg.exe /T"
        : "pkill -9 ffmpeg";

    exec(command, (error) => {
      if (error) {
        console.log(
          "No FFmpeg processes to kill or error killing them:",
          error.message,
        );
      } else {
        console.log("FFmpeg processes killed successfully.");
      }
      resolve();
    });
  });
};
