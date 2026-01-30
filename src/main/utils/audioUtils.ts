import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

export const downloadTikTokAudio = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), "temp", "audio.mp3");
    const ytDlpPath = path.join(process.cwd(), "resources", "yt-dlp.exe");

    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ytdlp = spawn(ytDlpPath, [
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      outputPath,
      url,
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

export const getAudioDuration = (filePath: string): Promise<number> => {
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

export const trimAudio = (
  inputPath: string,
  outputPath: string,
  duration: number,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .duration(duration)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) =>
        reject(new Error(`Failed to trim audio: ${err.message}`)),
      )
      .run();
  });
};
