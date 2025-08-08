import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function applyGpuMode() {
  if (process.env.NODE_ENV !== 'development') return;
  const mode = (process.env.GPU_MODE || 'metal').toLowerCase();
  // Reset-like: common flags first
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  if (process.env.ELECTRON_SINGLE_PROCESS === '1') {
    app.commandLine.appendSwitch('single-process');
  }

  switch (mode) {
    case 'metal':
      app.commandLine.appendSwitch('use-angle', 'metal');
      app.commandLine.appendSwitch('use-gl', 'angle');
      app.commandLine.appendSwitch('disable-vulkan');
      app.commandLine.appendSwitch('disable-software-rasterizer');
      break;
    case 'gl_angle':
      app.commandLine.appendSwitch('use-angle', 'gl');
      app.commandLine.appendSwitch('use-gl', 'angle');
      app.commandLine.appendSwitch('disable-vulkan');
      break;
    case 'desktop_gl':
      app.commandLine.appendSwitch('use-gl', 'desktop');
      app.commandLine.appendSwitch('disable-vulkan');
      break;
    case 'swiftshader':
      // Software GL via SwiftShader
      app.commandLine.appendSwitch('use-gl', 'swiftshader');
      break;
    case 'disable':
      app.disableHardwareAcceleration();
      break;
    default:
      // auto
      app.commandLine.appendSwitch('disable-vulkan');
      break;
  }
  // Print selected mode
  console.log(`[GPU] Mode: ${mode}`);
}

applyGpuMode();

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../../preload/dist/preload.cjs'),
      webSecurity: true,
      devTools: true,
    },
  });

  // Prevent any navigation away from our app (e.g., accidental file drops)
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (process.env.NODE_ENV === 'development') {
    await win.loadURL('http://localhost:5183');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(join(__dirname, '../../renderer/dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Log renderer crashes with reason to aid debugging
app.on('web-contents-created', (_event, contents) => {
  contents.on('render-process-gone', (_e, details) => {
    console.error('Renderer process gone:', details.reason, details);
  });
  contents.on('unresponsive', () => {
    console.error('Renderer became unresponsive');
  });
});

// IPC: capture helpers
ipcMain.handle('select-capture-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('save-frame', async (_evt, args: { dir: string; filename: string; dataURL: string }) => {
  const { dir, filename, dataURL } = args;
  const comma = dataURL.indexOf(',');
  const b64 = comma >= 0 ? dataURL.slice(comma + 1) : dataURL;
  const buf = Buffer.from(b64, 'base64');
  const target = join(dir, filename);
  await fs.writeFile(target, buf);
  return true;
});

ipcMain.handle('select-video-output', async () => {
  const res = await dialog.showSaveDialog({ defaultPath: 'visualizer.mp4', filters: [{ name: 'MP4', extensions: ['mp4'] }] });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});

ipcMain.handle('encode-frames', async (_evt, args: { dir: string; pattern: string; fps: number; output: string }) => {
  const { dir, pattern, fps, output } = args;
  return new Promise<boolean>((resolve) => {
    const ff = spawn('ffmpeg', ['-y', '-framerate', String(fps), '-i', pattern, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output], { cwd: dir });
    ff.on('error', () => resolve(false));
    ff.on('exit', (code) => resolve(code === 0));
  });
});

ipcMain.handle('save-text-file', async (_evt, args: { defaultName: string; content: string }) => {
  const { defaultName, content } = args;
  const res = await dialog.showSaveDialog({ defaultPath: defaultName, filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (res.canceled || !res.filePath) return null;
  await fs.writeFile(res.filePath, content, 'utf-8');
  return res.filePath;
});

ipcMain.handle('open-json-file', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (res.canceled || res.filePaths.length === 0) return null;
  const p = res.filePaths[0];
  const txt = await fs.readFile(p, 'utf-8');
  return txt;
});


