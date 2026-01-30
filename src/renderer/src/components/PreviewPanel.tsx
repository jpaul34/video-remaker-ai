import React, { useEffect, useState, useRef } from "react";
import { LineStyle } from "../hooks/useVideoConfig";
import { VideoHistoryItem } from "../types";

interface PreviewPanelProps {
  currentVideo: VideoHistoryItem | null;
  aspectRatio: string;
  subtitleColor: string;
  fontSize: number;
  subtitleStyleType: string;
  fontWeight: string;
  subtitlePosition: string;
  subtitleTextAlign: string;
  previewText: string;
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  generatedScript: string;
  avatarEnabled: boolean;
  avatarFile: string;
  avatarShape: string;
  avatarPosition: string;
  avatarSize: number;
  avatarChromaKey: string;
  mode: "ai" | "manual";
  manualImages: string[];
  wordsPerLine: number;
  linesPerSubtitle: number;
  useGeneralStyle: boolean;
  fontFamily: string;
  lineStyles: LineStyle[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  currentVideo,
  aspectRatio,
  subtitleColor,
  fontSize,
  subtitleStyleType,
  fontWeight,
  subtitlePosition,
  subtitleTextAlign,
  previewText,
  isGenerating,
  progress,
  currentStep,
  generatedScript,
  avatarEnabled,
  avatarFile,
  avatarShape,
  avatarPosition,
  avatarSize,
  avatarChromaKey,
  mode,
  manualImages,
  wordsPerLine,
  linesPerSubtitle,
  useGeneralStyle,
  fontFamily,
  lineStyles,
}) => {
  // Calculate avatar position
  const getAvatarPosition = () => {
    const positions: Record<string, string> = {
      "bottom-right": "bottom-0 right-0",
      "bottom-left": "bottom-0 left-0",
      "top-right": "top-0 right-0",
      "top-left": "top-0 left-0",
    };
    return positions[avatarPosition] || "bottom-0 right-0";
  };

  // Calculate subtitle position
  const getSubtitlePosition = () => {
    const positions: Record<string, string> = {
      "top-left": "top-0 left-0 text-left",
      "top-center": "top-0 left-0 right-0 text-center",
      "top-right": "top-0 right-0 text-right",
      "middle-left": "top-1/2 -translate-y-1/2 left-0 text-left",
      "middle-center": "top-1/2 -translate-y-1/2 left-0 right-0 text-center",
      "middle-right": "top-1/2 -translate-y-1/2 right-0 text-right",
      "bottom-left": "bottom-0 left-0 text-left",
      "bottom-center": "bottom-0 left-0 right-0 text-center",
      "bottom-right": "bottom-0 right-0 text-right",
    };
    return positions[subtitlePosition] || "bottom-0 left-0 right-0 text-center";
  };

  // Helper to process chroma key on an image/frame
  const processChromaKey = (
    source: HTMLImageElement | HTMLVideoElement,
    color: string,
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width =
      source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    canvas.height =
      source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Target colors in RGB
    const targetColors: Record<string, [number, number, number]> = {
      green: [0, 255, 0],
      blue: [0, 0, 255],
      red: [255, 0, 0],
      white: [255, 255, 255],
      black: [0, 0, 0],
    };

    const target = targetColors[color];
    if (!target) return canvas.toDataURL();

    // Threshold for color matching
    const threshold = 150; // Increased threshold for better removal

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate distance to target color
      const distance = Math.sqrt(
        Math.pow(r - target[0], 2) +
          Math.pow(g - target[1], 2) +
          Math.pow(b - target[2], 2),
      );

      if (distance < threshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  };

  // Ref for video container to calculate dimensions
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // State for video frame capture
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const isVideo = avatarFile.toLowerCase().match(/\.(mp4|webm|mov)$/);

    if (isVideo) {
      const video = document.createElement("video");
      video.src = `file://${avatarFile}`;
      video.crossOrigin = "anonymous";
      video.currentTime = 0.5; // Capture at 0.5s
      video.onseeked = () => {
        if (avatarChromaKey !== "none") {
          setAvatarPreviewUrl(processChromaKey(video, avatarChromaKey));
        } else {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            setAvatarPreviewUrl(canvas.toDataURL());
          }
        }
      };
    } else {
      // It's an image
      const img = new Image();
      img.src = `file://${avatarFile}`;
      img.onload = () => {
        if (avatarChromaKey !== "none") {
          setAvatarPreviewUrl(processChromaKey(img, avatarChromaKey));
        } else {
          setAvatarPreviewUrl(`file://${avatarFile}`);
        }
      };
    }
  }, [avatarFile, avatarChromaKey]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#0f172a]">
      <div
        className="flex flex-col items-center justify-start p-4"
        style={{ height: "75vh" }}
      >
        <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center">
          {/* Video Player or Preview */}
          <div className="w-full max-w-[800px] h-[600px] bg-black rounded-2xl border border-slate-800 flex justify-center items-center overflow-hidden shadow-2xl relative mx-auto">
            {(() => {
              const [w, h] = aspectRatio.split(":").map(Number);
              const isHorizontal = w / h > 800 / 600;
              const virtualHeight = aspectRatio === "9:16" ? 1920 : 1080;
              const commonStyle = {
                aspectRatio: `${w}/${h}`,
                width: isHorizontal ? "100%" : "auto",
                height: isHorizontal ? "auto" : "100%",
                maxWidth: "100%",
                maxHeight: "100%",
              };

              return currentVideo && currentVideo.videoPath ? (
                <div className="overflow-hidden" style={commonStyle}>
                  <video
                    key={currentVideo.id}
                    controls
                    className="w-full h-full object-contain"
                    src={`file://${currentVideo.videoPath}`}
                  >
                    Tu navegador no soporta el elemento de video.
                  </video>
                </div>
              ) : (
                <div
                  ref={videoContainerRef}
                  className="overflow-hidden relative transition-all duration-300 mx-auto"
                  style={{
                    ...commonStyle,
                    containerType: "size",
                  }}
                >
                  {/* Background Grid/Placeholder or Manual Image */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        mode === "manual" &&
                        manualImages &&
                        manualImages.length > 0
                          ? `url('file://${manualImages[0].replace(/\\/g, "/")}')`
                          : "linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
                      backgroundSize:
                        mode === "manual" &&
                        manualImages &&
                        manualImages.length > 0
                          ? "cover"
                          : "20px 20px",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      opacity:
                        mode === "manual" &&
                        manualImages &&
                        manualImages.length > 0
                          ? 1
                          : 0.2,
                    }}
                  ></div>

                  {/* Subtitle Preview */}
                  <div className="absolute inset-0 pointer-events-none p-4">
                    <div
                      className={`absolute px-4 ${getSubtitlePosition()}`}
                      style={{
                        paddingBottom: subtitlePosition.includes("bottom")
                          ? "5cqh"
                          : "0",
                        paddingTop: subtitlePosition.includes("top")
                          ? "5cqh"
                          : "0",
                        textAlign: "center", // Apply to container of lines
                        maxWidth: "90%", // Apply to container of lines
                        wordWrap: "break-word",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.2",
                      }}
                    >
                      {(() => {
                        const text =
                          previewText || "¡Escribe algo para probar!";
                        const words = text.trim().split(/\s+/);
                        const totalWordsCount = wordsPerLine * linesPerSubtitle;
                        const selectedWords = words.slice(0, totalWordsCount);

                        // Split into lines
                        const lines: string[] = [];
                        for (
                          let i = 0;
                          i < selectedWords.length;
                          i += wordsPerLine
                        ) {
                          lines.push(
                            selectedWords.slice(i, i + wordsPerLine).join(" "),
                          );
                        }

                        return lines.map((line, idx) => {
                          const lineStyle =
                            !useGeneralStyle && lineStyles[idx]
                              ? lineStyles[idx]
                              : {
                                  color: subtitleColor,
                                  fontSize: fontSize,
                                  fontFamily: fontFamily,
                                  styleType: subtitleStyleType,
                                  fontWeight: fontWeight,
                                };

                          const textShadow =
                            lineStyle.styleType === "outline"
                              ? "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000"
                              : "none";

                          const backgroundColor =
                            lineStyle.styleType === "shadow" ||
                            lineStyle.styleType === "background"
                              ? "rgba(0, 0, 0, 1.0)"
                              : "transparent";

                          const padding =
                            lineStyle.styleType === "shadow" ||
                            lineStyle.styleType === "background"
                              ? "0.3em 0.6em"
                              : "0";

                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                justifyContent:
                                  subtitleTextAlign === "left"
                                    ? "flex-start"
                                    : subtitleTextAlign === "right"
                                      ? "flex-end"
                                      : "center",
                                width: "100%",
                                margin: "0.1em 0",
                              }}
                            >
                              <div
                                style={{
                                  color: lineStyle.color,
                                  fontSize: `${(lineStyle.fontSize / virtualHeight) * 100}cqh`,
                                  fontFamily: lineStyle.fontFamily,
                                  fontWeight:
                                    lineStyle.fontWeight === "bold"
                                      ? "700"
                                      : lineStyle.fontWeight === "semibold"
                                        ? "600"
                                        : "400",
                                  textShadow,
                                  backgroundColor,
                                  padding,
                                  borderRadius: "0.2em",
                                  display: "inline-block",
                                  wordBreak: "break-word",
                                  maxWidth: "90%",
                                  textAlign: subtitleTextAlign as any,
                                }}
                              >
                                {line.split("\\N").map((part, pidx) => (
                                  <React.Fragment key={pidx}>
                                    {part.toUpperCase()}
                                    {pidx < line.split("\\N").length - 1 && (
                                      <br />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Avatar Overlay Preview */}
                  {avatarEnabled && avatarFile && (
                    <div
                      className="absolute z-10 pointer-events-none"
                      style={{
                        height: `${avatarSize}%`,
                        width: "auto",
                        bottom: avatarPosition.includes("bottom") ? 0 : "auto",
                        top: avatarPosition.includes("top") ? 0 : "auto",
                        right: avatarPosition.includes("right") ? 0 : "auto",
                        left: avatarPosition.includes("left") ? 0 : "auto",
                      }}
                    >
                      <img
                        src={avatarPreviewUrl || `file://${avatarFile}`}
                        alt="Avatar overlay"
                        className={`${avatarShape === "circle" ? "rounded-full" : "rounded-lg"} shadow-lg h-full w-auto block`}
                        style={{ objectFit: "fill" }}
                      />
                    </div>
                  )}

                  {/* Info Overlay */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between text-[10px] text-slate-500 font-mono z-20 opacity-50">
                    <span>{aspectRatio}</span>
                    <span>PREVIEW MODE</span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!isGenerating && (
                      <div className="text-center opacity-50">
                        <svg
                          className="w-16 h-16 text-slate-600 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <p>Vista Previa</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Guion Display - Below the 75vh area */}
        <div className="w-full max-w-4xl mt-8 pb-8">
          {/* Progress Bar */}
          {isGenerating && (
            <div className="bg-[#1a1f2e] rounded-xl border border-slate-800 p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">
                  {currentStep}
                </span>
                <span className="text-sm font-bold text-blue-400">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 transition-all duration-500 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Generated Script Display */}
          {generatedScript && !isGenerating && (
            <div className="bg-[#1a1f2e] rounded-xl border border-slate-800 p-6 shadow-lg">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Guion Generado
              </h4>
              <p className="text-white leading-relaxed whitespace-pre-wrap">
                {generatedScript}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default PreviewPanel;
