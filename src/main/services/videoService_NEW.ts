// REWRITTEN createVideo - Two-stage BMP conversion approach
export const createVideo_NEW = (config: VideoConfig): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const {
      imagesDir,
      audioPath,
      outputPath,
      duration,
      aspectRatio,
      imageDurations,
    } = config;

    const normOutputPath = outputPath;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Define resolutions
    const resolutions = {
      "16:9": { w: 1920, h: 1080 },
      "9:16": { w: 1080, h: 1920 },
      "1:1": { w: 1080, h: 1080 },
      "3:4": { w: 810, h: 1080 },
    };
    const { w, h } = resolutions[aspectRatio] || resolutions["16:9"];

    // Get all images
    const images = fs
      .readdirSync(imagesDir)
      .filter((file) => /\.(jpg|jpeg|png|bmp)$/i.test(file))
      .sort()
      .map((file) => path.join(imagesDir, file));

    if (images.length === 0) {
      reject(new Error(`No images found in ${imagesDir}`));
      return;
    }

    const hasCustomDurations =
      imageDurations && imageDurations.length === images.length;
    const durationPerImage = hasCustomDurations
      ? 0
      : parseFloat((duration / images.length).toFixed(2));

    logger.log(
      `[createVideo] Processing ${images.length} images for ${duration}s video at ${w}x${h}`,
    );

    // CRITICAL FIX: Two-stage approach for BMP static images
    // Stage 1: Convert each BMP to a video segment with proper duration
    const tempDir = path.join(path.dirname(outputPath), "temp_segments");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoSegments: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imgDuration = hasCustomDurations
        ? imageDurations![i]
        : durationPerImage;

      const segmentPath = path.join(
        tempDir,
        `segment_${i.toString().padStart(3, "0")}.mp4`,
      );

      await new Promise<void>((resolveSegment, rejectSegment) => {
        logger.log(
          `[createVideo] Creating segment ${i + 1}/${images.length}: ${imgDuration}s`,
        );

        ffmpeg(img)
          .inputOptions(["-loop", "1", "-framerate", "30"])
          .videoFilters([
            `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
            "format=yuv420p",
          ])
          .outputOptions([
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-t",
            `${imgDuration}`,
            "-pix_fmt",
            "yuv420p",
          ])
          .output(segmentPath)
          .on("end", () => {
            videoSegments.push(segmentPath);
            resolveSegment();
          })
          .on("error", (err) => {
            logger.error(`[createVideo] Segment ${i} error: ${err.message}`);
            rejectSegment(err);
          })
          .run();
      });
    }

    logger.log(
      `[createVideo] All ${videoSegments.length} segments created. Concatenating...`,
    );

    // Stage 2: Concat video segments with audio
    const inputListPath = path.join(
      path.dirname(outputPath),
      "segments_list.txt",
    );
    const inputListContent = videoSegments
      .map((seg) => `file '${seg.replace(/\\/g, "/")}'`)
      .join("\n");

    fs.writeFileSync(inputListPath, inputListContent);
    logger.log(`[createVideo] Segments list created`);

    let command = ffmpeg();

    command = command
      .input(inputListPath)
      .inputOptions(["-f", "concat", "-safe", "0"]);

    if (audioPath && fs.existsSync(audioPath)) {
      command = command.input(audioPath);
      command.outputOptions(["-map", "0:v", "-map", "1:a"]);
      command.outputOptions(["-c:a", "aac", "-b:a", "128k", "-ac", "2"]);
    }

    // Copy video since segments are already encoded
    command = command
      .outputOptions(["-c:v", "copy", "-movflags", "+faststart"])
      .output(normOutputPath);

    // Event handlers
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

      // Verify file exists
      if (!fs.existsSync(outputPath)) {
        const error = new Error(
          `FFmpeg claimed success but output file doesn't exist: ${outputPath}`,
        );
        logger.error(`[createVideo] ${error.message}`);
        reject(error);
        return;
      }

      const fileSize = fs.statSync(outputPath).size;
      logger.log(`[createVideo] Video completed. File size: ${fileSize} bytes`);

      // Clean up temp files
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
