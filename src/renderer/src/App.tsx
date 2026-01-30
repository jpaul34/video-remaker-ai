import React from "react";
import ConfigPanel from "./components/ConfigPanel";
import PreviewPanel from "./components/PreviewPanel";
import HistoryPanel from "./components/HistoryPanel";
import { useVideoConfig } from "./hooks/useVideoConfig";
import { useVideoProgress } from "./hooks/useVideoProgress";
import { useVideoGeneration } from "./hooks/useVideoGeneration";

const App: React.FC = () => {
  // Custom hooks for state management
  const config = useVideoConfig();
  const { progress, currentStep } = useVideoProgress();
  const {
    isGenerating,
    videoHistory,
    currentVideo,
    generatedScript,
    generateVideo,
    handleDownload,
    handleView,
    resetGeneration,
  } = useVideoGeneration();

  // Handle video generation
  const handleGenerate = () => {
    generateVideo({
      theme: config.theme,
      duration: config.duration,
      language: config.language,
      voiceGender: config.voiceGender,
      avatarEnabled: config.avatarEnabled,
      avatarUrl: config.avatarFile || config.avatarUrl, // Use file if available, otherwise URL
      avatarPosition: config.avatarPosition,
      avatarSize: config.avatarSize,
      avatarShape: config.avatarShape,
      avatarChromaKey: config.avatarChromaKey,
      subtitleColor: config.subtitleColor,
      fontSize: config.fontSize,
      aspectRatio: config.aspectRatio,
      wordsPerLine: config.wordsPerLine,
      borderWidth: config.borderWidth,
      borderColor: config.borderColor,
      fontWeight: config.fontWeight,
      subtitleTextAlign: config.subtitleTextAlign,
      useMock: config.useMock,
      mode: config.mode,
      manualScript: config.manualScript,
      manualImages: config.manualImages,
      subtitlePosition: config.subtitlePosition,
      linesPerSubtitle: config.linesPerSubtitle,
      useGeneralStyle: config.useGeneralStyle,
      fontFamily: config.fontFamily,
      lineStyles: config.lineStyles,
      marginL: config.marginL,
      marginR: config.marginR,
      marginT: config.marginT,
      marginB: config.marginB,
    });
  };

  const handleReset = () => {
    config.resetConfig();
    resetGeneration();
  };

  return (
    <div className="h-screen w-screen bg-[#0a0e1a] text-white flex overflow-hidden">
      {/* Left Sidebar - Config Panel */}
      <ConfigPanel
        {...config}
        isGenerating={isGenerating}
        handleGenerate={handleGenerate}
        mode={config.mode}
        setMode={config.setMode}
        manualScript={config.manualScript}
        setManualScript={config.setManualScript}
        manualImages={config.manualImages}
        setManualImages={config.setManualImages}
        hasGenerated={!!currentVideo && !isGenerating}
        handleReset={handleReset}
        subtitlePosition={config.subtitlePosition}
        setSubtitlePosition={config.setSubtitlePosition}
        subtitleTextAlign={config.subtitleTextAlign}
        setSubtitleTextAlign={config.setSubtitleTextAlign}
        linesPerSubtitle={config.linesPerSubtitle}
        setLinesPerSubtitle={config.setLinesPerSubtitle}
        fontWeight={config.fontWeight}
        setFontWeight={config.setFontWeight}
      />

      {/* Main Content Area - Split between Preview and History */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Section - Takes 60% */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PreviewPanel
            currentVideo={currentVideo}
            aspectRatio={config.aspectRatio}
            subtitleColor={config.subtitleColor}
            fontSize={config.fontSize}
            borderWidth={config.borderWidth}
            borderColor={config.borderColor}
            fontWeight={config.fontWeight}
            subtitlePosition={config.subtitlePosition}
            subtitleTextAlign={config.subtitleTextAlign}
            previewText={
              config.mode === "manual"
                ? config.manualScript
                : config.previewText
            }
            isGenerating={isGenerating}
            progress={progress}
            currentStep={currentStep}
            generatedScript={generatedScript}
            avatarEnabled={config.avatarEnabled}
            avatarFile={config.avatarFile}
            avatarShape={config.avatarShape}
            avatarPosition={config.avatarPosition}
            avatarSize={config.avatarSize}
            avatarChromaKey={config.avatarChromaKey}
            mode={config.mode}
            manualImages={config.manualImages}
            wordsPerLine={config.wordsPerLine}
            linesPerSubtitle={config.linesPerSubtitle}
            useGeneralStyle={config.useGeneralStyle}
            fontFamily={config.fontFamily}
            lineStyles={config.lineStyles}
            marginL={config.marginL}
            marginR={config.marginR}
            marginT={config.marginT}
            marginB={config.marginB}
          />
        </div>

        {/* History Section - Takes 40% */}
        <div className="w-[400px] border-l border-slate-700/50 flex flex-col overflow-hidden">
          <HistoryPanel
            videoHistory={videoHistory}
            handleDownload={handleDownload}
            handleView={handleView}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
