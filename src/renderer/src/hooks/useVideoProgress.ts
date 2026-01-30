import { useEffect, useState } from 'react';

/**
 * Custom hook to manage IPC progress updates from Electron main process
 */
export const useVideoProgress = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    // Try to get ipcRenderer directly (requires nodeIntegration: true)
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const handleProgress = (_: any, data: { step: string; progress: number }) => {
        setCurrentStep(data.step);
        setProgress(data.progress);
      };
      ipcRenderer.on('video-progress', handleProgress);
      return () => {
        ipcRenderer.removeListener('video-progress', handleProgress);
      };
    } catch (e) {
      console.warn('Could not access ipcRenderer directly:', e);
      // Fallback to window.electron if available
      if ((window as any).electron && (window as any).electron.onVideoProgress) {
        return (window as any).electron.onVideoProgress((data: { step: string; progress: number }) => {
          setCurrentStep(data.step);
          setProgress(data.progress);
        });
      }
    }
  }, []);

  return { progress, currentStep };
};
