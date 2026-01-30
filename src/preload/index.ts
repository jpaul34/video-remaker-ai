import { ipcRenderer } from 'electron'

console.log('PRELOAD LOADED SUCCESSFULLY');

// Expose APIs directly to window
// @ts-ignore
window.electron = {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      const subscription = (_event: any, ...args: any[]) => func(...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func)
    }
  },
  generateCompleteVideo: (params: any) => ipcRenderer.invoke('generate-complete-video', params),
  onVideoProgress: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on('video-progress', subscription)
    return () => ipcRenderer.removeListener('video-progress', subscription)
  }
}
