import { useState } from "react";

export interface LineStyle {
  color: string;
  fontSize: number;
  fontFamily: string;
  styleType: string; // none, outline, shadow
  fontWeight: string; // normal, semibold, bold
}

/**
 * Custom hook to manage all video configuration state
 */
export const useVideoConfig = () => {
  const [theme, setTheme] = useState("");
  const [language, setLanguage] = useState("es-EC");
  const [voiceGender, setVoiceGender] = useState("male");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(15);
  const [avatarEnabled, setAvatarEnabled] = useState(false);
  const [avatarShape, setAvatarShape] = useState("square");
  const [avatarPosition, setAvatarPosition] = useState("bottom-right");
  const [avatarSize, setAvatarSize] = useState(20); // Percentage of video height
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(""); // Local file path for GIF/video
  const [avatarChromaKey, setAvatarChromaKey] = useState("none"); // none, green, blue, red, white, black
  const [subtitleColor, setSubtitleColor] = useState("#FFFF00");
  const [fontSize, setFontSize] = useState(48);
  const [wordsPerLine, setWordsPerLine] = useState(1);
  const [subtitleStyleType, setSubtitleStyleType] = useState("outline"); // outline, shadow, none
  const [fontWeight, setFontWeight] = useState("bold"); // normal, semibold, bold
  const [useMock, setUseMock] = useState(false);
  const [previewText, setPreviewText] = useState(
    "¡Este es un ejemplo de subtítulo!",
  );
  const [subtitlePosition, setSubtitlePosition] = useState("middle-center");
  const [subtitleTextAlign, setSubtitleTextAlign] = useState("center"); // left, center, right
  const [linesPerSubtitle, setLinesPerSubtitle] = useState(1);
  const [useGeneralStyle, setUseGeneralStyle] = useState(true);
  const [fontFamily, setFontFamily] = useState("Arial");

  const defaultLineStyles: LineStyle[] = [
    {
      color: "#FFFF00",
      fontSize: 48,
      fontFamily: "Arial",
      styleType: "outline",
      fontWeight: "bold",
    },
    {
      color: "#FFFFFF",
      fontSize: 48,
      fontFamily: "Arial",
      styleType: "outline",
      fontWeight: "bold",
    },
    {
      color: "#00FFFF",
      fontSize: 48,
      fontFamily: "Arial",
      styleType: "outline",
      fontWeight: "bold",
    },
  ];
  const [lineStyles, setLineStyles] = useState<LineStyle[]>(defaultLineStyles);

  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [manualScript, setManualScript] = useState("");
  const [manualImages, setManualImages] = useState<string[]>([]);

  const resetConfig = () => {
    setTheme("");
    setLanguage("es-EC");
    setVoiceGender("male");
    setAspectRatio("16:9");
    setDuration(15);
    setAvatarEnabled(false);
    setAvatarShape("square");
    setAvatarPosition("bottom-right");
    setAvatarSize(100);
    setAvatarUrl("");
    setAvatarFile("");
    setAvatarChromaKey("none");
    setSubtitleColor("#FFFF00");
    setFontSize(48);
    setWordsPerLine(1);
    setSubtitleStyleType("outline");
    setFontWeight("bold");
    setPreviewText("¡Este es un ejemplo de subtítulo!");
    setSubtitlePosition("middle-center");
    setSubtitleTextAlign("center");
    setLinesPerSubtitle(1);
    setUseGeneralStyle(true);
    setFontFamily("Arial");
    setLineStyles(defaultLineStyles);
    setMode("ai");
    setManualScript("");
    setManualImages([]);
  };

  return {
    mode,
    setMode,
    manualScript,
    setManualScript,
    manualImages,
    setManualImages,
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
    useMock,
    setUseMock,
    previewText,
    setPreviewText,
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
    resetConfig,
  };
};
