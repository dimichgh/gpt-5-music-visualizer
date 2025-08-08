export {};

declare global {
  interface Window {
    ipcBridge: {
      selectCaptureDir(): Promise<string | null>;
      saveFrame(dir: string, filename: string, dataURL: string): Promise<boolean>;
      selectVideoOutput(): Promise<string | null>;
      encodeFrames(dir: string, pattern: string, fps: number, output: string): Promise<boolean>;
      saveTextFile(defaultName: string, content: string): Promise<string | null>;
      openJsonFile(): Promise<string | null>;
    };
  }
}


