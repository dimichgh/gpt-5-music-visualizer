import { contextBridge, ipcRenderer } from 'electron';

// Minimal secure bridge placeholder
contextBridge.exposeInMainWorld('ipcBridge', {
  selectCaptureDir: async (): Promise<string | null> => {
    return ipcRenderer.invoke('select-capture-dir');
  },
  saveFrame: async (dir: string, filename: string, dataURL: string): Promise<boolean> => {
    return ipcRenderer.invoke('save-frame', { dir, filename, dataURL });
  },
  selectVideoOutput: async (): Promise<string | null> => {
    return ipcRenderer.invoke('select-video-output');
  },
  encodeFrames: async (dir: string, pattern: string, fps: number, output: string): Promise<boolean> => {
    return ipcRenderer.invoke('encode-frames', { dir, pattern, fps, output });
  },
  saveTextFile: async (defaultName: string, content: string): Promise<string | null> => {
    return ipcRenderer.invoke('save-text-file', { defaultName, content });
  },
  openJsonFile: async (): Promise<string | null> => {
    return ipcRenderer.invoke('open-json-file');
  },
});

export {};


