import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AudioEngine, AudioFeaturesFrame } from './audio/AudioEngine';
import { SceneView } from './three/SceneView';
import { PRESETS, getPresetById, VisualPreset } from './ui/presets';

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SceneView | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTone, setIsTone] = useState(false);
  const [toneFreq, setToneFreq] = useState(220);
  const [volume, setVolume] = useState(0.8);
  const [beatSensitivity, setBeatSensitivity] = useState(0.6);
  const [presetId, setPresetId] = useState<string>('aurora');
  const [isRecording, setIsRecording] = useState(false);
  const captureDirRef = useRef<string | null>(null);
  const frameIdxRef = useRef<number>(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    sceneRef.current = new SceneView(containerRef.current);
    return () => sceneRef.current?.dispose();
  }, []);

  useEffect(() => {
    const engine = (engineRef.current ||= new AudioEngine());
    const off = engine.onFrame((frame: AudioFeaturesFrame) => {
      sceneRef.current?.updateFromAudio(frame.rms, frame.bands.low, frame.bands.mid, frame.bands.high, frame.beat);
      // Save frames while recording
      if (isRecording && captureDirRef.current) {
        const dataURL = sceneRef.current?.captureFrame();
        if (dataURL) {
          const idx = frameIdxRef.current++;
          const filename = `frame_${String(idx).padStart(6, '0')}.png`;
          window.ipcBridge.saveFrame(captureDirRef.current, filename, dataURL);
        }
      }
    });
    const offEnded = engine.onEnded(() => {
      setIsPlaying(false);
    });
    return () => {
      off();
      offEnded();
    };
  }, [isRecording]);

  // Prevent file-drop from navigating away (Electron default browser behavior)
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    };
  }, []);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    // Stop test tone if running
    if (isTone) {
      engineRef.current?.stopTestTone();
      setIsTone(false);
    }
    try {
      await engineRef.current!.loadFile(file);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load audio');
    }
  };

  const onToggle = async () => {
    if (!engineRef.current) return;
    if (!isPlaying) {
      try {
        await engineRef.current.start();
        setIsPlaying(true);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to start');
      }
    } else {
      engineRef.current.stop();
      setIsPlaying(false);
    }
  };

  const onToggleTone = async () => {
    if (!engineRef.current) return;
    if (!isTone) {
      await engineRef.current.startTestTone(220);
      setIsTone(true);
    } else {
      engineRef.current.stopTestTone();
      setIsTone(false);
    }
  };

  return (
    <div style={{ color: '#e6f0ff', background: 'radial-gradient(1200px 600px at 20% -10%, #0a1430, #050914 60%, #02040a 100%)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: 1, color: '#b7c7ff' }}>Music Visualizer</h1>
        <select value={presetId} onChange={(e) => {
          const id = e.target.value; setPresetId(id);
          const p: VisualPreset = getPresetById(id);
          setBeatSensitivity(p.beatSensitivity);
          engineRef.current?.setBeatSensitivity(p.beatSensitivity);
          // Star density update
          (sceneRef.current as any)?.setStarDensity?.(p.starDensity);
        }}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input type="file" accept="audio/*" onChange={onPickFile} style={{ color: '#9fb3ff' }} />
        <button onClick={async () => {
          const preset = {
            name: getPresetById(presetId).name,
            palette: getPresetById(presetId).palette,
            beatSensitivity,
            starDensity: (getPresetById(presetId).starDensity),
            nebulaEnabled: false,
            volume,
          };
          const path = await window.ipcBridge.saveTextFile('preset.json', JSON.stringify(preset, null, 2));
          if (!path) setError('Save cancelled');
        }}>Save Preset</button>
        <button onClick={async () => {
          const txt = await window.ipcBridge.openJsonFile();
          if (!txt) return;
          try {
            const data = JSON.parse(txt);
            if (typeof data.beatSensitivity === 'number') {
              setBeatSensitivity(data.beatSensitivity);
              engineRef.current?.setBeatSensitivity(data.beatSensitivity);
            }
            if (typeof data.volume === 'number') {
              setVolume(data.volume);
              engineRef.current?.setVolume(data.volume);
            }
            if (typeof data.starDensity === 'number') {
              (sceneRef.current as any)?.setStarDensity?.(data.starDensity);
            }
          } catch {
            setError('Invalid preset file');
          }
        }}>Load Preset</button>
        <button onClick={async () => {
          try {
            // System audio via display media (Chromium macOS may allow system audio capture)
            // Fallback to microphone if system audio is unavailable
            const constraints: any = { audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 } };
            let stream: MediaStream | null = null;
            if ((navigator.mediaDevices as any).getDisplayMedia) {
              try {
                stream = await (navigator.mediaDevices as any).getDisplayMedia({ audio: true, video: false });
              } catch {}
            }
            if (!stream) {
              stream = await navigator.mediaDevices.getUserMedia(constraints);
            }
            await engineRef.current?.startFromMediaStream(stream);
            setIsPlaying(true);
            setFileName('Live Input');
          } catch (e: any) {
            setError(e?.message ?? 'Live capture failed');
          }
        }}>Live Capture</button>
        <button onClick={onToggle} disabled={!fileName} style={{ padding: '6px 10px', borderRadius: 6, background: '#1e2b57', color: '#dfe7ff', border: '1px solid #32406f' }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={onToggleTone} style={{ padding: '6px 10px', borderRadius: 6, background: '#1e2b57', color: '#dfe7ff', border: '1px solid #32406f' }}>{isTone ? 'Stop Tone' : 'Test Tone'}</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Vol</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              engineRef.current?.setVolume(v);
            }}
          />
        </label>
        <button onClick={async () => {
          if (!(window as any).ipcBridge || typeof (window as any).ipcBridge.selectCaptureDir !== 'function') {
            setError('Recording requires a full app reload to initialize the capture bridge. Please stop and start dev, then try again.');
            return;
          }
          if (!isRecording) {
            if (!captureDirRef.current) {
              captureDirRef.current = await window.ipcBridge.selectCaptureDir();
              if (!captureDirRef.current) return;
            }
            frameIdxRef.current = 0;
            setIsRecording(true);
          } else {
            setIsRecording(false);
          }
        }} style={{ padding: '6px 10px', borderRadius: 6, background: '#1e2b57', color: '#dfe7ff', border: '1px solid #32406f' }}>
          {isRecording ? 'Stop Rec' : 'Record Frames'}
        </button>
        {!isRecording && (
          <button onClick={async () => {
            if (!captureDirRef.current) return setError('No capture folder yet. Click Record once to choose.');
            const output = await window.ipcBridge.selectVideoOutput();
            if (!output) return;
            const ok = await window.ipcBridge.encodeFrames(captureDirRef.current, 'frame_%06d.png', 60, output);
            if (!ok) setError('ffmpeg failed. Ensure ffmpeg is installed and in PATH.');
          }} style={{ padding: '6px 10px', borderRadius: 6, background: '#1e2b57', color: '#dfe7ff', border: '1px solid #32406f' }}>Encode Video</button>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Beat</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={beatSensitivity}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBeatSensitivity(v);
              engineRef.current?.setBeatSensitivity(v);
            }}
          />
        </label>
        <input
          type="range"
          min={110}
          max={880}
          step={1}
          value={toneFreq}
          onChange={(e) => {
            const f = Number(e.target.value);
            setToneFreq(f);
            engineRef.current?.setTestToneFrequency(f);
          }}
          style={{ width: 160 }}
        />
        <span style={{ width: 60, textAlign: 'right' }}>{toneFreq} Hz</span>
        <span style={{ opacity: 0.7 }}>{fileName ?? 'No file'}</span>
        {error && <span style={{ color: '#ff5577' }}>Error: {error}</span>}
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 200, borderTop: '1px solid rgba(255,255,255,0.06)' }} />
    </div>
  );
}

const container = document.getElementById('root')!;
// Ensure we don't create multiple roots on HMR reloads
const anyWindow = window as any;
let root = anyWindow.__app_root as ReturnType<typeof createRoot> | undefined;
if (!root) {
  root = createRoot(container);
  anyWindow.__app_root = root;
}
root.render(<App />);


