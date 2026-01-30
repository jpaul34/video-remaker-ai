const manualScript =
  "This is a single block of text that should definitely be split but maybe the user didn't use double newlines so it looks like one scene.";
const manualImages = [
  "img1.png",
  "img2.png",
  "img3.png",
  "img4.png",
  "img5.png",
];
const audioDuration = 15.0;

let scenesText = [];

// Logic from index.ts
if (manualScript && manualImages && manualImages.length > 0) {
  scenesText = manualScript.split(/\n\n+/).filter((s) => s.trim().length > 0);

  if (scenesText.length !== manualImages.length) {
    scenesText = manualScript.split(/\n+/).filter((s) => s.trim().length > 0);
  }
}

console.log(`Scenes found: ${scenesText.length}`);
console.log(`Images provided: ${manualImages.length}`);

let imageDurations = [];

// CRITICAL FIX LOGIC
if (
  (manualScript && manualImages && scenesText.length !== manualImages.length) ||
  scenesText.length === 0
) {
  console.log(
    `[SceneSync] Mismatch or empty scenes. Forcing Equal Distribution.`,
  );
  imageDurations = [];
} else {
  // CharRatio logic (simulated)
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
  }
}

console.log("Final Image Durations:", imageDurations);
if (imageDurations.length === 0) {
  console.log("SUCCESS: Fallback to Equal Distribution triggered.");
} else if (imageDurations.length === manualImages.length) {
  console.log("SUCCESS: Durations match image count.");
} else {
  console.log("FAILURE: Mismatch persisting.");
}
