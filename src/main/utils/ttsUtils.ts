import { spawn } from "child_process";
import fs from "fs";
import { logger } from "./logger";
import { parseSRT } from "./subtitleParser";

export const generateVoice = async (
  text: string,
  voiceName: string,
  outputPath: string,
): Promise<{ audioPath: string; jsonPath: string }> => {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log(
        `generateVoice: Intento ${attempt}/${maxRetries} para edge-tts.`,
      );
      return await new Promise((resolve, reject) => {
        const jsonPath = outputPath.replace(/\.[^/.]+$/, ".json");
        const srtPath = outputPath.replace(/\.[^/.]+$/, ".srt");
        const textPath = outputPath.replace(/\.[^/.]+$/, ".txt");

        // Write text to file to avoid encoding issues with CLI arguments
        try {
          fs.writeFileSync(textPath, text, "utf-8");
        } catch (e: any) {
          return reject(
            new Error(`Failed to write temp text file: ${e.message}`),
          );
        }

        // Use python -m edge_tts to ensure we use the installed module
        const pythonProcess = spawn("python", [
          "-m",
          "edge_tts",
          "--file",
          textPath,
          "--voice",
          voiceName,
          "--write-media",
          outputPath,
          "--write-subtitles",
          srtPath,
        ]);

        let errorOutput = "";

        pythonProcess.stderr.on("data", (data) => {
          const msg = data.toString().trim();
          errorOutput += msg;
          logger.log(`[edge-tts stderr] ${msg}`);
        });

        pythonProcess.on("close", (code) => {
          // Clean up temp text file
          if (fs.existsSync(textPath)) {
            try {
              fs.unlinkSync(textPath);
            } catch (e) {}
          }

          if (
            code === 0 &&
            fs.existsSync(outputPath) &&
            fs.existsSync(srtPath)
          ) {
            try {
              const segments = parseSRT(srtPath);
              fs.writeFileSync(
                jsonPath,
                JSON.stringify(segments, null, 2),
                "utf-8",
              );
              try {
                fs.unlinkSync(srtPath);
              } catch (e) {}
              resolve({ audioPath: outputPath, jsonPath });
            } catch (parseError: any) {
              reject(new Error(`Failed to parse SRT: ${parseError.message}`));
            }
          } else {
            reject(
              new Error(`edge-tts failed with code ${code}: ${errorOutput}`),
            );
          }
        });

        pythonProcess.on("error", (err) => {
          if (fs.existsSync(textPath)) {
            try {
              fs.unlinkSync(textPath);
            } catch (e) {}
          }
          reject(new Error(`Failed to start python process: ${err.message}`));
        });
      });
    } catch (error: any) {
      lastError = error;
      logger.error(
        `generateVoice: Error en intento ${attempt}: ${error.message}`,
      );
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff
        logger.log(`generateVoice: Reintentando en ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
};
