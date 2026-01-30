import { useState, useCallback, useEffect } from "react";
import { LineStyle } from "./useVideoConfig";
import { VideoHistoryItem } from "../types";

interface VideoGenerationParams {
  theme: string;
  duration: number;
  language: string;
  voiceGender: string;
  avatarEnabled: boolean;
  avatarUrl?: string;
  avatarPosition: string;
  avatarSize: number;
  avatarShape: string;
  avatarChromaKey: string;
  subtitleColor: string;
  fontSize: number;
  aspectRatio: string;
  wordsPerLine: number;
  borderWidth: "thin" | "medium" | "thick";
  borderColor: string;
  useMock: boolean;
  mode: "ai" | "manual";
  manualScript?: string;
  manualImages?: string[];
  subtitlePosition: string;
  subtitleTextAlign: string;
  linesPerSubtitle: number;
  useGeneralStyle: boolean;
  fontFamily: string;
  fontWeight: string;
  lineStyles: LineStyle[];
  marginL: number;
  marginR: number;
  marginT: number;
  marginB: number;
}

/**
 * Custom hook to manage video generation logic and history
 */
export const useVideoGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoHistoryItem | null>(
    null,
  );
  const [generatedScript, setGeneratedScript] = useState("");

  const generateVideo = async (params: VideoGenerationParams) => {
    // Validation
    if (params.mode === "ai") {
      if (!params.useMock && !params.theme.trim()) {
        alert("Por favor ingresa un tema o tópico");
        return;
      }
    } else {
      // Manual mode validation
      if (!params.manualScript?.trim()) {
        alert("Por favor ingresa el guion del video");
        return;
      }
      if (!params.manualImages || params.manualImages.length === 0) {
        alert("Por favor selecciona al menos una imagen");
        return;
      }
    }

    setIsGenerating(true);
    setGeneratedScript("");

    try {
      let ipcRenderer;
      try {
        ipcRenderer = (window as any).require("electron").ipcRenderer;
      } catch (e) {
        // Fallback
        if (!(window as any).electron) {
          throw new Error("Electron API no disponible. Ejecuta: npm run dev");
        }
      }

      // Call Electron main process
      let result;
      // Map frontend params to backend expected params
      const backendParams = {
        ...params,
        avatarPath: params.avatarUrl, // Map avatarUrl to avatarPath
        avatarMuteAudio: true, // Default to true as per requirements
        subtitleStyle: {
          color: params.subtitleColor,
          fontSize: params.fontSize,
          borderWidth: params.borderWidth,
          borderColor: params.borderColor,
          wordsPerLine: params.wordsPerLine,
          linesPerSubtitle: params.linesPerSubtitle,
          position: params.subtitlePosition,
          useGeneralStyle: params.useGeneralStyle,
          fontFamily: params.fontFamily,
          fontWeight: params.fontWeight,
          subtitleTextAlign: params.subtitleTextAlign,
          lineStyles: params.lineStyles,
          marginL: params.marginL,
          marginR: params.marginR,
          marginT: params.marginT,
          marginB: params.marginB,
        },
      };

      if (ipcRenderer) {
        result = await ipcRenderer.invoke(
          "generate-complete-video",
          backendParams,
        );
      } else {
        result = await (window as any).electron.generateCompleteVideo(
          backendParams,
        );
      }

      if (result.success) {
        setGeneratedScript(result.script);

        // Add to history
        const newVideo: VideoHistoryItem = {
          id: Date.now().toString(),
          theme: params.theme || "Video de Prueba",
          time: new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: new Date(),
          videoPath: result.videoPath,
          script: result.script,
        };

        setVideoHistory((prev) => [newVideo, ...prev]);
        setCurrentVideo(newVideo);

        setTimeout(() => {
          setIsGenerating(false);
        }, 2000);
      } else {
        throw new Error("Error al generar el video");
      }
    } catch (error: any) {
      console.error("Error generating video:", error);

      const errorMsg =
        `Error al generar video: ${error.message}\n\n` +
        `Asegúrate de tener instaladas las dependencias:\n` +
        `1. edge-tts: pip install edge-tts\n` +
        `2. FFmpeg en resources/ffmpeg.exe\n` +
        `3. Gemini API Key configurada en .env`;

      alert(errorMsg);

      setTimeout(() => {
        setIsGenerating(false);
      }, 3000);
    }
  };

  const handleDownload = (video: VideoHistoryItem) => {
    if (video.videoPath) {
      alert(
        `Video guardado en:\n${video.videoPath}\n\nPuedes encontrarlo en la carpeta de Videos.`,
      );
    }
  };

  const handleView = (video: VideoHistoryItem) => {
    setCurrentVideo(video);
    setGeneratedScript(video.script || "");
  };

  const resetGeneration = () => {
    setCurrentVideo(null);
    setGeneratedScript("");
    setIsGenerating(false);
  };

  return {
    isGenerating,
    videoHistory,
    currentVideo,
    generatedScript,
    generateVideo,
    handleDownload,
    handleView,
    resetGeneration,
  };
};
