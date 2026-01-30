"use strict";
const electron = require("electron");
console.log("PRELOAD LOADED SUCCESSFULLY");
window.electron = {
  ipcRenderer: {
    invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => {
      const subscription = (_event, ...args) => func(...args);
      electron.ipcRenderer.on(channel, subscription);
      return () => electron.ipcRenderer.removeListener(channel, subscription);
    },
    removeListener: (channel, func) => {
      electron.ipcRenderer.removeListener(channel, func);
    }
  },
  generateCompleteVideo: (params) => electron.ipcRenderer.invoke("generate-complete-video", params),
  onVideoProgress: (callback) => {
    const subscription = (_, data) => callback(data);
    electron.ipcRenderer.on("video-progress", subscription);
    return () => electron.ipcRenderer.removeListener("video-progress", subscription);
  }
};
