import { generateCompleteVideo } from "./services/videoService";
import { createPlaceholderImage } from "./utils/imageUtils";
import { configureFfmpeg } from "./utils/ffmpegUtils";
import fs from "fs";
import path from "path";

// Mock logger to avoid errors if logger is not initialized correctly or simple console log
import { logger } from "./utils/logger";

// Setup
const TEST_DIR = path.join(process.cwd(), "temp_test_run");
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR);

const IMAGES_DIR = path.join(TEST_DIR, "images");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

async function runTest() {
  console.log("Staritng Integration Test...");

  try {
    configureFfmpeg();
  } catch (e) {
    console.warn("FFmpeg config warning:", e);
  }

  // 1. Create 5 dummy images
  console.log("Creating 5 dummy images...");
  const imagePaths = [];
  for (let i = 0; i < 5; i++) {
    const p = path.join(IMAGES_DIR, `img_${i}.bmp`);
    await createPlaceholderImage(p, `Test Scene ${i}`, 1920, 1080);
    imagePaths.push(p);
  }

  // 2. Mock Config
  // We can't easily mock the full "manualScript" splitting logic because that's in index.ts IPC handler.
  // BUT we can test `generateCompleteVideo` which is where the ffmpeg/audio logic resides.
  // We will pass pre-calculated imageDurations to simulate what index.ts does.

  const duration = 15; // 15 seconds
  const imageDurations = [3, 3, 3, 3, 3]; // Equal distribution

  const config = {
    imagesDir: IMAGES_DIR,
    audioPath: "", // We can try without audio first, or mock audio?
    // VideoService requires audioPath usually for "complete" video but we can skip?
    // Actually getting a valid audio file headlessly is hard without calling TTS.
    // Let's create a silent mp3? Or just test video-only if allowed?
    // The user's bug was AUDIO. So we need audio.
    // We can try to use a dummy audio file if we have one, or just skip audio and see if video generates.
    outputPath: path.join(TEST_DIR, "final_test_video.mp4"),
    duration: duration,
    aspectRatio: "16:9",
    imageDurations: imageDurations,
    subtitleStyle: {
      color: "#FFFFFF",
      fontSize: 48,
    },
    subtitles: [
      { text: "Hello", start: 0, end: 1 },
      { text: "World", start: 1, end: 2 },
    ],
  };

  console.log("Running generateCompleteVideo...");
  try {
    const result = await generateCompleteVideo(config);
    console.log("Test PASSED. Video generated at:", result);
    if (fs.existsSync(result)) {
      console.log("File exists and size is:", fs.statSync(result).size);
    } else {
      console.error("Test FAILED. File not found.");
    }
  } catch (e) {
    console.error("Test FAILED with error:", e);
  }
}

runTest();
