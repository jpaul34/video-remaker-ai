import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "./logger";

export interface AvatarConfig {
  path: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size: number; // Percentage of video height (0.1 to 1.0)
  chromaKey?: string; // Hex color to remove (e.g., "#00FF00")
  duration?: number; // Duration to trim the output to
  muteAudio?: boolean; // Whether to mute the avatar's audio (default: true)
}

export const addAvatarOverlay = (
  videoPath: string,
  config: AvatarConfig,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const {
      path: avatarPath,
      position,
      size,
      chromaKey,
      duration,
      muteAudio = true,
    } = config;

    if (!fs.existsSync(avatarPath)) {
      logger.error(`[addAvatarOverlay] Avatar file not found: ${avatarPath}`);
      return resolve(videoPath); // Skip if not found, return original video
    }

    const outputPath = videoPath.replace(/\.mp4$/i, "_avatar.mp4");
    logger.log(
      `[addAvatarOverlay] Adding avatar to video. Output: ${outputPath}`,
    );

    // 1. Probe video to get dimensions
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        logger.error(`[addAvatarOverlay] Probe error: ${err.message}`);
        return reject(new Error(`Failed to probe video: ${err.message}`));
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      const W = videoStream?.width || 1280;
      const H = videoStream?.height || 720;

      // Calculate avatar scale
      // We want avatar height to be size * H
      // scale=-1:H*size (maintain aspect ratio)
      const targetHeight = Math.round(H * size);

      // Construct filter chain
      // 1. Scale avatar
      // 2. Colorkey (if needed)
      // 3. Overlay

      let filterChain: string[] = [];
      let avatarStream = "[1:v]"; // Input 1 is avatar

      // Scale
      filterChain.push(`${avatarStream}scale=-1:${targetHeight}[scaled]`);
      let lastStream = "[scaled]";

      // Chroma Key
      if (chromaKey && chromaKey !== "none") {
        // Convert hex to 0xRRGGBB
        const color = chromaKey.replace("#", "0x");
        // colorkey=color:similarity:blend
        // 0.1 similarity is usually good for green screen
        filterChain.push(`${lastStream}colorkey=${color}:0.1:0.1[transparent]`);
        lastStream = "[transparent]";
      }

      // Position
      const margin = 0; // No safe zones as requested
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
        default: // bottom-right
          overlayX = `W-w-${margin}`;
          overlayY = `H-h-${margin}`;
      }

      // Overlay
      // [0:v][lastStream]overlay=x:y
      filterChain.push(
        `[0:v]${lastStream}overlay=x=${overlayX}:y=${overlayY}[outv]`,
      );

      let command = ffmpeg(videoPath)
        .input(avatarPath)
        .complexFilter(filterChain, ["outv"]);

      // Output Options
      const outputOptions = [
        "-map",
        "0:a", // Explicitly map audio from base video (Input 0)
        // "-map", "[outv]", // Removed to avoid double mapping (handled by complexFilter)
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
      ];

      // Audio handling
      // We copy the audio stream we just mapped
      outputOptions.push("-c:a", "copy");

      // Duration trimming
      if (duration) {
        outputOptions.push("-t", `${duration}`);
      }

      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on("start", (cmd) => logger.log(`[addAvatarOverlay] Command: ${cmd}`))
        .on("end", () => {
          logger.log(`[addAvatarOverlay] Complete.`);
          // Clean up the input video (intermediate step)
          if (fs.existsSync(videoPath)) {
            try {
              fs.unlinkSync(videoPath);
            } catch (e) {
              logger.log(
                `[addAvatarOverlay] Warning: Could not delete intermediate video: ${videoPath}`,
              );
            }
          }
          resolve(outputPath);
        })
        .on("error", (err, stdout, stderr) => {
          logger.error(`[addAvatarOverlay] Error: ${err.message}`);
          logger.error(`[addAvatarOverlay] Stderr: ${stderr}`);
          reject(err);
        });

      command.run();
    });
  });
};
