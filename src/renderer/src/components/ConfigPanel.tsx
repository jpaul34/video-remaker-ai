import React, { useState } from "react";
import { LineStyle } from "../hooks/useVideoConfig";

interface ConfigPanelProps {
  theme: string;
  setTheme: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  voiceGender: string;
  setVoiceGender: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  avatarEnabled: boolean;
  setAvatarEnabled: (value: boolean) => void;
  avatarShape: string;
  setAvatarShape: (value: string) => void;
  avatarPosition: string;
  setAvatarPosition: (value: string) => void;
  avatarSize: number;
  setAvatarSize: (value: number) => void;
  avatarUrl: string;
  setAvatarUrl: (value: string) => void;
  avatarFile: string;
  setAvatarFile: (value: string) => void;
  avatarChromaKey: string;
  setAvatarChromaKey: (value: string) => void;
  subtitleColor: string;
  setSubtitleColor: (value: string) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  wordsPerLine: number;
  setWordsPerLine: (value: number) => void;
  subtitleStyleType: string;
  setSubtitleStyleType: (value: string) => void;
  fontWeight: string;
  setFontWeight: (value: string) => void;
  subtitlePosition: string;
  setSubtitlePosition: (value: string) => void;
  subtitleTextAlign: string;
  setSubtitleTextAlign: (value: string) => void;
  linesPerSubtitle: number;
  setLinesPerSubtitle: (value: number) => void;
  useGeneralStyle: boolean;
  setUseGeneralStyle: (value: boolean) => void;
  fontFamily: string;
  setFontFamily: (value: string) => void;
  lineStyles: LineStyle[];
  setLineStyles: (value: LineStyle[]) => void;
  previewText: string;
  setPreviewText: (value: string) => void;
  useMock: boolean;
  setUseMock: (value: boolean) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  mode: "ai" | "manual";
  setMode: (value: "ai" | "manual") => void;
  manualScript: string;
  setManualScript: (value: string) => void;
  manualImages: string[];
  setManualImages: (value: string[]) => void;
  hasGenerated: boolean;
  handleReset: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  theme,
  setTheme,
  language,
  setLanguage,
  voiceGender,
  setVoiceGender,
  aspectRatio,
  setAspectRatio,
  duration,
  setDuration,
  avatarEnabled,
  setAvatarEnabled,
  avatarShape,
  setAvatarShape,
  avatarPosition,
  setAvatarPosition,
  avatarSize,
  setAvatarSize,
  avatarUrl,
  setAvatarUrl,
  avatarFile,
  setAvatarFile,
  avatarChromaKey,
  setAvatarChromaKey,
  subtitleColor,
  setSubtitleColor,
  fontSize,
  setFontSize,
  wordsPerLine,
  setWordsPerLine,
  subtitleStyleType,
  setSubtitleStyleType,
  fontWeight,
  setFontWeight,
  subtitlePosition,
  setSubtitlePosition,
  subtitleTextAlign,
  setSubtitleTextAlign,
  linesPerSubtitle,
  setLinesPerSubtitle,
  useGeneralStyle,
  setUseGeneralStyle,
  fontFamily,
  setFontFamily,
  lineStyles,
  setLineStyles,
  previewText,
  setPreviewText,
  useMock,
  setUseMock,
  isGenerating,
  handleGenerate,
  mode,
  setMode,
  manualScript,
  setManualScript,
  manualImages,
  setManualImages,
  hasGenerated,
  handleReset,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeLineTab, setActiveLineTab] = useState(0);

  const handleManualImageSelect = async () => {
    try {
      const { ipcRenderer } = (window as any).require("electron");
      const result = await ipcRenderer.invoke("dialog:openFile", {
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "bmp"],
          },
        ],
      });
      if (result && !result.canceled && result.filePaths.length > 0) {
        setManualImages([...manualImages, ...result.filePaths]);
      }
    } catch (error) {
      console.error("Error selecting files:", error);
    }
  };

  const handleFileSelect = async () => {
    try {
      const { ipcRenderer } = (window as any).require("electron");
      const result = await ipcRenderer.invoke("dialog:openFile", {
        filters: [
          {
            name: "Media",
            extensions: ["gif", "mp4", "webm", "mov", "png", "jpg", "jpeg"],
          },
        ],
      });
      if (result && !result.canceled && result.filePaths.length > 0) {
        setAvatarFile(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      alert(
        "Error al seleccionar archivo. Asegúrate de ejecutar la app con Electron.",
      );
    }
  };

  return (
    <div className="w-[380px] bg-gradient-to-b from-[#0f1420] to-[#0a0e1a] border-r border-slate-700/50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gemotion Studio</h1>
            <p className="text-xs text-slate-400">Generador de Videos con IA</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex p-1 bg-slate-900/50 rounded-lg mb-4">
          <button
            onClick={() => setMode("ai")}
            disabled={hasGenerated || isGenerating}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "ai"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            } ${hasGenerated || isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            ✨ Automático (IA)
          </button>
          <button
            onClick={() => setMode("manual")}
            disabled={hasGenerated || isGenerating}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "manual"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            } ${hasGenerated || isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            🛠️ Manual
          </button>
        </div>

        {/* Mock Mode Toggle (Only for AI Mode) */}
        {mode === "ai" && (
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-600/40 rounded-lg hover:border-amber-500/60 transition-all group">
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
              disabled={hasGenerated || isGenerating}
              className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500 cursor-pointer disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-300">
                  Modo Prueba
                </span>
                <span className="text-lg">🧪</span>
              </div>
              <span className="text-xs text-amber-400/80">
                Sin gastar cuota de API
              </span>
            </div>
          </label>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {/* Main Content Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Contenido
            </h3>
          </div>

          {mode === "ai" ? (
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                Tema del Video
                {useMock && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                    Opcional
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    useMock
                      ? "Opcional - Se usará tema de ejemplo"
                      : "Ej: Historia de Terror, Datos Curiosos..."
                  }
                  className={`w-full bg-[#1a1f2e] border rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-all ${
                    useMock
                      ? "border-slate-700 opacity-60 cursor-not-allowed"
                      : "border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  }`}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={useMock || hasGenerated || isGenerating}
                />
                <button
                  onClick={() => {
                    const topics = [
                      "Historia de la Roma Antigua",
                      "Datos curiosos sobre el espacio",
                      "Los animales más peligrosos del mundo",
                      "Avances tecnológicos del 2024",
                      "Misterios sin resolver del océano",
                      "La historia del café",
                      "Cómo funciona la inteligencia artificial",
                      "Lugares abandonados increíbles",
                      "La vida de Nikola Tesla",
                      "Curiosidades del cuerpo humano",
                    ];
                    const randomTopic =
                      topics[Math.floor(Math.random() * topics.length)];
                    setTheme(randomTopic);
                  }}
                  className="px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 transition-colors"
                  title="Tema Aleatorio"
                  disabled={useMock || hasGenerated || isGenerating}
                >
                  🎲
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Manual Mode Inputs */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
                  Guion del Video
                  <div className="group relative">
                    <span className="cursor-help text-xs bg-slate-700 px-2 py-1 rounded-full">
                      ?
                    </span>
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 hidden group-hover:block text-xs text-slate-300">
                      Escribe el texto completo que será narrado. El sistema
                      generará los subtítulos y el audio automáticamente.
                    </div>
                  </div>
                </label>
                <textarea
                  className="w-full h-32 bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none text-sm"
                  placeholder="Escribe o pega tu guion aquí..."
                  value={manualScript}
                  onChange={(e) => setManualScript(e.target.value)}
                  disabled={hasGenerated || isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Imágenes ({manualImages.length})
                </label>
                <button
                  onClick={handleManualImageSelect}
                  disabled={hasGenerated || isGenerating}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed rounded-lg text-slate-400 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Seleccionar Imágenes
                </button>
                {manualImages.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {manualImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="w-12 h-12 flex-shrink-0 rounded overflow-hidden border border-slate-700 relative group"
                      >
                        <img
                          src={`file://${img}`}
                          alt={`img-${idx}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setManualImages(
                              manualImages.filter((_, i) => i !== idx),
                            );
                          }}
                          disabled={hasGenerated || isGenerating}
                          className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white w-5 h-5 flex items-center justify-center rounded-bl-lg transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar imagen"
                        >
                          <span className="text-xs font-bold leading-none mb-0.5">
                            ×
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Alineación del Texto
              </label>
              <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
                {[
                  { id: "left", label: "Izquierda" },
                  { id: "center", label: "Centro" },
                  { id: "right", label: "Derecha" },
                ].map((align) => (
                  <button
                    key={align.id}
                    onClick={() => setSubtitleTextAlign(align.id)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                      subtitleTextAlign === align.id
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {align.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Idioma
              </label>
              <select
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={hasGenerated || isGenerating}
              >
                <option value="es-EC">🇪🇸 Español</option>
                <option value="es-MX">🇲🇽 México</option>
                <option value="en-US">🇺🇸 English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Voz
              </label>
              <select
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value)}
                disabled={hasGenerated || isGenerating}
              >
                <option value="male">👨 Masculino</option>
                <option value="female">👩 Femenino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Formato
            </label>
            <select
              className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={hasGenerated || isGenerating}
            >
              <option value="16:9">📺 Horizontal (16:9) - YouTube</option>
              <option value="9:16">📱 Vertical (9:16) - TikTok/Reels</option>
              <option value="1:1">⬜ Cuadrado (1:1) - Instagram</option>
              <option value="3:4">📲 Retrato (3:4) - Stories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
              <span>Duración</span>
              <span className="text-purple-400 font-bold">{duration}s</span>
            </label>
            <input
              type="range"
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={hasGenerated || isGenerating}
              min="5"
              max="60"
              step="5"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>
        </div>

        {/* Subtitles Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Subtítulos
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color
              </label>
              <div className="relative">
                <input
                  type="color"
                  className="w-full h-11 bg-[#1a1f2e] border border-slate-600 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  value={subtitleColor}
                  onChange={(e) => setSubtitleColor(e.target.value)}
                  disabled={hasGenerated || isGenerating}
                />
                <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-white/10"></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Palabras x Línea
              </label>
              <select
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={wordsPerLine}
                onChange={(e) => setWordsPerLine(parseInt(e.target.value))}
                disabled={hasGenerated || isGenerating}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "palabra" : "palabras"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nº de Líneas
              </label>
              <select
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={linesPerSubtitle}
                onChange={(e) => setLinesPerSubtitle(parseInt(e.target.value))}
                disabled={hasGenerated || isGenerating}
              >
                {[1, 2, 3].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "Línea" : "Líneas"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                Estilo General
              </label>
              <button
                onClick={() => setUseGeneralStyle(!useGeneralStyle)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  useGeneralStyle ? "bg-blue-600" : "bg-slate-700"
                }`}
                disabled={hasGenerated || isGenerating}
              >
                <span
                  className={`${
                    useGeneralStyle ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>

            {useGeneralStyle ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fuente
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tamaño
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="64">XS</option>
                      <option value="96">SM</option>
                      <option value="128">MD</option>
                      <option value="160">LG</option>
                      <option value="200">XL</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Peso (Bold)
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value)}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="normal">Normal</option>
                      <option value="semibold">Semibold</option>
                      <option value="bold">Bold (Negrita)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-full h-9 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        value={subtitleColor}
                        onChange={(e) => setSubtitleColor(e.target.value)}
                        disabled={hasGenerated || isGenerating}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Resaltado (Borde / Sombra)
                  </label>
                  <select
                    className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                    value={subtitleStyleType}
                    onChange={(e) => setSubtitleStyleType(e.target.value)}
                    disabled={hasGenerated || isGenerating}
                  >
                    <option value="none">Ninguno</option>
                    <option value="outline">Borde</option>
                    <option value="shadow">Sombra</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
                  {[...Array(linesPerSubtitle)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveLineTab(idx)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeLineTab === idx
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Fila {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fuente (Fila {activeLineTab + 1})
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={lineStyles[activeLineTab]?.fontFamily || "Arial"}
                      onChange={(e) => {
                        const newStyles = [...lineStyles];
                        newStyles[activeLineTab] = {
                          ...(newStyles[activeLineTab] || {}),
                          fontFamily: e.target.value,
                        } as LineStyle;
                        setLineStyles(newStyles);
                      }}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tamaño
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={lineStyles[activeLineTab]?.fontSize || 48}
                      onChange={(e) => {
                        const newStyles = [...lineStyles];
                        newStyles[activeLineTab] = {
                          ...(newStyles[activeLineTab] || {}),
                          fontSize: parseInt(e.target.value),
                        } as LineStyle;
                        setLineStyles(newStyles);
                      }}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="32">XS</option>
                      <option value="48">SM</option>
                      <option value="64">MD</option>
                      <option value="80">LG</option>
                      <option value="100">XL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Color
                    </label>
                    <input
                      type="color"
                      className="w-full h-9 bg-transparent border-none cursor-pointer rounded"
                      value={lineStyles[activeLineTab]?.color || "#FFFFFF"}
                      onChange={(e) => {
                        const newStyles = [...lineStyles];
                        newStyles[activeLineTab] = {
                          ...(newStyles[activeLineTab] || {}),
                          color: e.target.value,
                        } as LineStyle;
                        setLineStyles(newStyles);
                      }}
                      disabled={hasGenerated || isGenerating}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Peso (Fila {activeLineTab + 1})
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={lineStyles[activeLineTab]?.fontWeight || "bold"}
                      onChange={(e) => {
                        const newStyles = [...lineStyles];
                        newStyles[activeLineTab] = {
                          ...(newStyles[activeLineTab] || {}),
                          fontWeight: e.target.value,
                        } as LineStyle;
                        setLineStyles(newStyles);
                      }}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="normal">Normal</option>
                      <option value="semibold">Semibold</option>
                      <option value="bold">Bold (Negrita)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Resaltado (Fila {activeLineTab + 1})
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      value={lineStyles[activeLineTab]?.styleType || "outline"}
                      onChange={(e) => {
                        const newStyles = [...lineStyles];
                        newStyles[activeLineTab] = {
                          ...(newStyles[activeLineTab] || {}),
                          styleType: e.target.value,
                        } as LineStyle;
                        setLineStyles(newStyles);
                      }}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="none">Ninguno</option>
                      <option value="outline">Borde</option>
                      <option value="shadow">Sombra</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Posición
            </label>
            <select
              className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={subtitlePosition}
              onChange={(e) => setSubtitlePosition(e.target.value)}
              disabled={hasGenerated || isGenerating}
            >
              <option value="top-left">↖️ Superior Izquierda</option>
              <option value="top-center">⬆️ Superior Centro</option>
              <option value="top-right">↗️ Superior Derecha</option>
              <option value="middle-left">⬅️ Centro Izquierda</option>
              <option value="middle-center">⏺️ Centro</option>
              <option value="middle-right">➡️ Centro Derecha</option>
              <option value="bottom-left">↙️ Inferior Izquierda</option>
              <option value="bottom-center">⬇️ Inferior Centro</option>
              <option value="bottom-right">↘️ Inferior Derecha</option>
            </select>
          </div>

          {mode === "ai" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Texto de Prueba
              </label>
              <input
                type="text"
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                disabled={hasGenerated || isGenerating}
                placeholder="Escribe para probar..."
              />
            </div>
          )}
        </div>

        {/* Advanced Settings - Collapsible */}
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800/70 rounded-lg transition-all text-sm font-medium text-slate-300"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Configuración Avanzada</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700/30">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={avatarEnabled}
                    onChange={(e) => setAvatarEnabled(e.target.checked)}
                    disabled={hasGenerated || isGenerating}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Avatar
                  </span>
                </label>
                {avatarEnabled && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                    Activo
                  </span>
                )}
              </div>

              {avatarEnabled && (
                <div className="space-y-3 pl-6 border-l-2 border-purple-500/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Forma
                      </label>
                      <select
                        className="w-full bg-[#1a1f2e] border border-slate-600 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={avatarShape}
                        onChange={(e) => setAvatarShape(e.target.value)}
                        disabled={hasGenerated || isGenerating}
                      >
                        <option value="circle">Círculo</option>
                        <option value="square">Cuadrado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Posición
                      </label>
                      <select
                        className="w-full bg-[#1a1f2e] border border-slate-600 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={avatarPosition}
                        onChange={(e) => setAvatarPosition(e.target.value)}
                        disabled={hasGenerated || isGenerating}
                      >
                        <option value="bottom-right">↘️ Abajo Der.</option>
                        <option value="bottom-left">↙️ Abajo Izq.</option>
                        <option value="top-right">↗️ Arriba Der.</option>
                        <option value="top-left">↖️ Arriba Izq.</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Tamaño (% del video)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={avatarSize}
                      onChange={(e) => setAvatarSize(parseInt(e.target.value))}
                      disabled={hasGenerated || isGenerating}
                      min="5"
                      max="50"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>5%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Chroma Key (Eliminar fondo)
                    </label>
                    <select
                      className="w-full bg-[#1a1f2e] border border-slate-600 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={avatarChromaKey}
                      onChange={(e) => setAvatarChromaKey(e.target.value)}
                      disabled={hasGenerated || isGenerating}
                    >
                      <option value="none">🚫 Sin chroma key</option>
                      <option value="green">🟢 Verde</option>
                      <option value="blue">🔵 Azul</option>
                      <option value="red">🔴 Rojo</option>
                      <option value="white">⚪ Blanco</option>
                      <option value="black">⚫ Negro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Archivo (GIF/Video/Imagen)
                    </label>
                    <button
                      onClick={handleFileSelect}
                      disabled={hasGenerated || isGenerating}
                      className="w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-2 border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      {avatarFile ? "Cambiar archivo" : "Seleccionar archivo"}
                    </button>
                    {avatarFile && (
                      <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/30">
                        <p
                          className="text-xs text-slate-400 truncate"
                          title={avatarFile}
                        >
                          📁{" "}
                          {avatarFile.split("\\").pop() ||
                            avatarFile.split("/").pop()}
                        </p>
                        <button
                          onClick={() => setAvatarFile("")}
                          disabled={hasGenerated || isGenerating}
                          className="mt-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✕ Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 border-t border-slate-700/50 bg-gradient-to-t from-[#0a0e1a] to-transparent">
        {hasGenerated ? (
          <button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Resetear Formulario</span>
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              (mode === "ai" && !useMock && !theme.trim()) ||
              (mode === "manual" &&
                (!manualScript.trim() || manualImages.length === 0))
            }
            className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30 disabled:shadow-none"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Generar Video</span>
              </>
            )}
          </button>
        )}

        {!useMock && !theme.trim() && !isGenerating && (
          <p className="text-xs text-amber-400/70 mt-2 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Ingresa un tema para comenzar
          </p>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ConfigPanel;
