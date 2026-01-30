// JavaScript version of the test
function reinjectPunctuation(script, timedWords) {
  // Split script into words, preserving original punctuation
  const originalWords = script.trim().split(/\s+/);
  if (originalWords.length === 0 || timedWords.length === 0) return timedWords;

  const result = [];
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

const script =
  "¿Te sientes sin energía? A veces lo único que necesitas es hidratarte. Tu cuerpo es setenta por ciento agua… ¡Toma agua y recarga tu día!";
const timedWords = [
  { text: "Te", start: 0, end: 0.5 },
  { text: "sientes", start: 0.5, end: 1.0 },
  { text: "sin", start: 1.0, end: 1.5 },
  { text: "energía?", start: 1.5, end: 2.0 },
  { text: "A", start: 2.0, end: 2.5 },
  { text: "veces", start: 2.5, end: 3.0 },
  { text: "lo", start: 3.0, end: 3.5 },
  { text: "único", start: 3.5, end: 4.0 },
  { text: "que", start: 4.0, end: 4.5 },
  { text: "necesitas", start: 4.5, end: 5.2 },
  { text: "es", start: 5.2, end: 5.5 },
  { text: "hidratarte.", start: 5.5, end: 6.0 },
  { text: "Tu", start: 6.0, end: 6.5 },
  { text: "cuerpo", start: 6.5, end: 7.0 },
  { text: "es", start: 7.0, end: 7.5 },
  { text: "setenta", start: 7.5, end: 8.0 },
  { text: "por", start: 8.0, end: 8.5 },
  { text: "ciento", start: 8.5, end: 9.0 },
  { text: "agua...", start: 9.0, end: 9.5 },
  { text: "Toma", start: 9.5, end: 10.0 },
  { text: "agua", start: 10.0, end: 10.5 },
  { text: "y", start: 10.5, end: 11.0 },
  { text: "recarga", start: 11.0, end: 11.5 },
  { text: "tu", start: 11.5, end: 12.0 },
  { text: "día!", start: 12.0, end: 12.5 },
];

const result = reinjectPunctuation(script, timedWords);
console.log(JSON.stringify(result, null, 2));

// Check specifically for the user's reported missing chars
const firstWord = result[0].text;
const tomaWord = result.find((w) => w.text.includes("Toma"))?.text;
const aguaWord = result.find((w) => w.text.includes("agua…"))?.text;

console.log("\n--- Verification ---");
console.log(`First word matches ¿Te?: ${firstWord === "¿Te"}`);
console.log(`Toma word matches ¡Toma: ${tomaWord === "¡Toma"}`);
console.log(`Agua word matches agua…: ${aguaWord === "agua…"}`);

if (firstWord !== "¿Te" || tomaWord !== "¡Toma" || aguaWord !== "agua…") {
  process.exit(1);
}
