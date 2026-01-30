import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

import {
  downloadTikTokAudio,
  generateVoice,
  createVideo,
  addAvatarOverlay,
  generateSubtitles,
  getAudioDuration,
  killFfmpegProcesses,
  generateCompleteVideo,
  createPlaceholderImage,
  convertImageToBmp,
} from "./services/videoService";

import { analyzeTrend, generateVideoContent } from "./services/gemini";
import fs from "fs";
import { configureFfmpeg } from "./utils/ffmpegUtils";
import { logger } from "./utils/logger";

// Configure FFmpeg globally
try {
  configureFfmpeg();
} catch (error) {
  console.error("Failed to configure FFmpeg:", error);
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    // Open DevTools to help debugging
    // mainWindow.webContents.openDevTools()
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  console.log("BUILD CHECK: VERSION 5 - RESTORED");

  // Clean up any ghost processes from previous sessions
  try {
    await killFfmpegProcesses();
  } catch (error) {
    console.log("No FFmpeg processes to kill or error during cleanup.");
  }

  electronApp.setAppUserModelId("com.video-remaker");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  // IPC Handler for file dialog
  ipcMain.handle("dialog:openFile", async (_, options) => {
    return await dialog.showOpenDialog(options);
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", async () => {
  // Ensure all FFmpeg processes are killed when app closes
  try {
    await killFfmpegProcesses();
  } catch (error) {
    // Ignore errors on quit
  }
});

// IPC Handlers
ipcMain.handle("download-tiktok", async (_, url) => {
  return await downloadTikTokAudio(url);
});

ipcMain.handle("generate-voice", async (_, text, voice, outputPath) => {
  return await generateVoice(text, voice, outputPath);
});

ipcMain.handle("analyze-trend", async (event, text) => {
  return await analyzeTrend(text, (msg: string) => {
    if (event && event.sender) {
      event.sender.send("video-progress", { step: msg, progress: 5 });
    }
  });
});

ipcMain.handle("create-video", async (_, config) => {
  return await createVideo(config);
});

ipcMain.handle("generate-complete-video", async (event, params) => {
  const {
    theme,
    duration,
    voiceGender,
    subtitleColor,
    fontSize,
    aspectRatio = "16:9",
    useMock = false,
    avatarPath,
    avatarPosition,
    avatarSize,
    avatarChromaKey,
    avatarMuteAudio,
    borderWidth,
    borderColor,
    subtitlePosition,
    subtitleTextAlign,
    linesPerSubtitle,
    wordsPerLine,
    fontWeight,
    fontFamily,
    useGeneralStyle,
    lineStyles,
    marginL,
    marginR,
    marginT,
    marginB,
  } = params;

  console.log(
    "DEBUG: Received params in generate-complete-video:",
    JSON.stringify(params, null, 2),
  );
  logger.log(`DEBUG: Avatar Path received: ${avatarPath}`);
  logger.log(`DEBUG: Avatar Position: ${avatarPosition}`);
  logger.log(`DEBUG: Avatar Size: ${avatarSize}`);

  // Define resolutions
  const resolutions = {
    "16:9": { w: 1920, h: 1080 },
    "9:16": { w: 1080, h: 1920 },
    "1:1": { w: 1080, h: 1080 },
    "3:4": { w: 810, h: 1080 },
  };
  const { w, h } =
    resolutions[aspectRatio as keyof typeof resolutions] || resolutions["16:9"];

  try {
    // --- NEW OUTPUT STRUCTURE ---
    const baseOutputDir = "C:/videos-ia";
    if (!fs.existsSync(baseOutputDir)) {
      fs.mkdirSync(baseOutputDir, { recursive: true });
    }

    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    const timestamp = `${YYYY}${MM}${DD}_${hh}${mm}${ss}_${ms}`;

    const sanitizedTheme = (theme || "video")
      .substring(0, 30)
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    const projectFolderName = `${timestamp}-${sanitizedTheme}`;
    const projectDir = path.join(baseOutputDir, projectFolderName);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Initialize logger for this project
    logger.setProjectDir(projectDir);
    logger.log(`Proyecto iniciado: ${projectFolderName}`);
    logger.log(
      `Tema: ${theme}, Duración: ${duration}s, Formato: ${aspectRatio}`,
    );

    const imagesDir = path.join(projectDir, "imagenes");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const audioPath = path.join(projectDir, "audio.mp3");
    const outputPath = path.join(projectDir, "video-generado.mp4");
    const jsonPath = path.join(projectDir, "datos-video.json");

    const { manualScript, manualImages } = params;
    let content;

    if (manualScript && manualImages && manualImages.length > 0) {
      // --- MANUAL MODE ---
      logger.log(
        "Modo Manual detectado. Usando guion e imágenes proporcionados.",
      );
      event.sender.send("video-progress", {
        step: "Procesando recursos manuales...",
        progress: 10,
      });

      content = {
        guion_mejorado: manualScript,
        prompts_imagen: manualImages.map(
          (_: any, i: number) => `Manual Image ${i + 1}`,
        ),
      };

      // Convert manual images to BMP in project directory
      logger.log(
        `Procesando y convirtiendo ${manualImages.length} imágenes manuales...`,
      );

      for (let i = 0; i < manualImages.length; i++) {
        const imgSrc = manualImages[i];
        // Pad index with leading zeros for correct sorting (01, 02, etc.)
        const paddedIndex = String(i + 1).padStart(2, "0");
        const destPath = path.join(
          imagesDir,
          `imagen-escena-${paddedIndex}.bmp`, // Force BMP extension
        );

        try {
          await convertImageToBmp(imgSrc, destPath);
          logger.log(`Imagen ${i + 1} convertida: ${destPath}`);
        } catch (err: any) {
          logger.error(`Error convirtiendo imagen ${imgSrc}: ${err.message}`);
          throw new Error(
            `Error al procesar la imagen ${path.basename(imgSrc)}. Asegúrate de que sea un archivo de imagen válido.`,
          );
        }
      }
    } else {
      // --- AI MODE ---
      event.sender.send("video-progress", {
        step: "Generando escenas con Gemini AI...",
        progress: 10,
      });
      logger.log("Iniciando generación de contenido con Gemini AI...");

      content = await generateVideoContent(
        theme,
        duration,
        imagesDir,
        (msg: string) => {
          event.sender.send("video-progress", {
            step: msg,
            progress: 10,
          });
        },
        useMock,
      );
    }

    // Save project metadata
    fs.writeFileSync(jsonPath, JSON.stringify(content, null, 2));

    event.sender.send("video-progress", {
      step: "Generando voz con IA...",
      progress: 20,
    });
    logger.log(`Generando voz (${voiceGender})...`);

    const voiceMap: { [key: string]: string } = {
      male: "es-MX-JorgeNeural",
      female: "es-MX-DaliaNeural",
    };
    const voiceName = voiceMap[voiceGender] || "es-MX-DaliaNeural";

    // Generate voice and get JSON for word-level subtitles
    let wordTimingsPath = "";
    try {
      const voiceResult = await generateVoice(
        content.guion_mejorado,
        voiceName,
        audioPath,
      );
      wordTimingsPath = voiceResult.jsonPath;
    } catch (err) {
      logger.error(`[CRITICAL] Voice generation failed: ${err}`);
      // Fallback or rethrow? If no audio, video might fail depending on flags.
      // We'll proceed but log heavily.
    }

    const audioDuration = await getAudioDuration(audioPath);
    logger.log(`Audio generado. Duración: ${audioDuration}s`);

    const videoDuration = audioDuration || duration; // Use audio duration if available

    // --- SCENE SYNC LOGIC ---
    let imageDurations: number[] = [];
    try {
      if (fs.existsSync(wordTimingsPath)) {
        const wordTimings = JSON.parse(
          fs.readFileSync(wordTimingsPath, "utf-8"),
        );

        let scenesText: string[] = [];

        if (manualScript && manualImages && manualImages.length > 0) {
          // Manual Mode: Split by double newline or use equal distribution fallback
          scenesText = manualScript
            .split(/\n\n+/)
            .filter((s: string) => s.trim().length > 0);
          // If split doesn't match image count, try single newline
          if (scenesText.length !== manualImages.length) {
            scenesText = manualScript
              .split(/\n+/)
              .filter((s: string) => s.trim().length > 0);
          }
          // If still mismatch, we'll fall back to equal division later by returning empty scenesText
        } else {
          // AI Mode
          scenesText = content.escenas?.map((e: any) => e.texto) || [];
        }

        // CRITICAL FIX: If we still don't have matching scene counts, we MUST enforce it or the video service will fail to use custom durations.
        // If Manual Mode and counts mismatch, assume 1:1 mapping is impossible and set imageDurations = [] to force equal distribution
        if (
          manualScript &&
          manualImages &&
          scenesText.length !== manualImages.length
        ) {
          logger.log(
            `[SceneSync] Mismatch: ${scenesText.length} scenes vs ${manualImages.length} images. Forcing Equal Distribution.`,
          );
          imageDurations = [];
        } else if (scenesText.length > 0) {
          // Proceed with CharRatio calculation only if counts align or we are in AI mode (where images are generated FROM scenes)
          const fullScriptClean = scenesText.join("");
          const totalChars = fullScriptClean.length;

          if (totalChars > 0 && audioDuration) {
            imageDurations = scenesText.map((scene) => {
              const ratio = scene.length / totalChars;
              return parseFloat((ratio * audioDuration).toFixed(2));
            });

            // Adjust last duration to match exact total
            if (imageDurations.length > 0) {
              const currentTotal = imageDurations.reduce((a, b) => a + b, 0);
              const diff = audioDuration - currentTotal;
              imageDurations[imageDurations.length - 1] += diff;
            }
            logger.log(
              `[SceneSync] Durations calculated by CharRatio: ${JSON.stringify(imageDurations)}`,
            );
          }
        }
      }
    } catch (e) {
      logger.error(`[SceneSync] Error calculating scene durations: ${e}`);
    }

    if (!manualImages) {
      event.sender.send("video-progress", {
        step: "Creando imágenes de las escenas...",
        progress: 40,
      });
      logger.log(
        `Creando ${content.prompts_imagen.length} imágenes de escena...`,
      );

      for (let i = 0; i < content.prompts_imagen.length; i++) {
        const imagePath = path.join(imagesDir, `imagen-escena-${i + 1}.bmp`);
        await createPlaceholderImage(imagePath, `Scene ${i + 1}`, w, h);
      }
    } else {
      logger.log("Modo Manual: Saltando generación de imágenes placeholder.");
    }

    event.sender.send("video-progress", {
      step: "Renderizando video con audio y subtítulos...",
      progress: 70,
    });
    logger.log("Iniciando renderizado final del video...");

    const videoConfig = {
      imagesDir,
      audioPath, // Audio re-enabled
      outputPath,
      duration: videoDuration,
      aspectRatio,
      imageDurations, // Pass calculated durations
      avatarPath,
      avatarPosition,
      avatarSize,
      avatarChromaKey,
      avatarMuteAudio,
      subtitleStyle: {
        color: subtitleColor,
        fontSize: fontSize,
        wordsPerLine: params.wordsPerLine,
        linesPerSubtitle: linesPerSubtitle,
        borderWidth: borderWidth || "medium",
        borderColor: borderColor || "#000000",
        position: subtitlePosition,
        subtitleTextAlign: subtitleTextAlign,
        useGeneralStyle: params.useGeneralStyle,
        fontFamily: params.fontFamily,
        fontWeight: params.fontWeight,
        lineStyles: params.lineStyles,
        marginL: marginL,
        marginR: marginR,
        marginT: marginT,
        marginB: marginB,
      },
      subtitles: generateSubtitles(
        content.guion_mejorado,
        videoDuration,
        wordTimingsPath, // Use the generated JSON for exact word sync
      ),
    };

    logger.log(
      `Subtítulos generados: ${videoConfig.subtitles.length} palabras encontradas.`,
    );

    await generateCompleteVideo(videoConfig);

    event.sender.send("video-progress", {
      step: "¡Video completado con éxito!",
      progress: 100,
    });
    logger.log("¡Proceso completado con éxito!");
    logger.save();

    return {
      success: true,
      videoPath: outputPath,
      script: content.guion_mejorado,
    };
  } catch (error: any) {
    console.error("Error generating video:", error);
    event.sender.send("video-progress", {
      step: `Error: ${error.message}`,
      progress: 0,
    });
    logger.error("Error en el proceso de generación", error);
    logger.save();
    throw error;
  }
});
