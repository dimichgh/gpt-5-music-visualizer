export type PaletteName = 'aurora' | 'cosmic' | 'solar';

export type VisualPreset = {
  id: string;
  name: string;
  palette: PaletteName;
  beatSensitivity: number; // 0..1
  starDensity: number; // number of stars
};

export const PRESETS: VisualPreset[] = [
  { id: 'aurora', name: 'Aurora', palette: 'aurora', beatSensitivity: 0.6, starDensity: 700 },
  { id: 'cosmic', name: 'Cosmic Dust', palette: 'cosmic', beatSensitivity: 0.5, starDensity: 1200 },
  { id: 'solar', name: 'Solar Flare', palette: 'solar', beatSensitivity: 0.7, starDensity: 900 },
];

export function getPresetById(id: string | null | undefined): VisualPreset {
  const p = PRESETS.find((p) => p.id === id);
  return p ?? PRESETS[0];
}

export type SavedPreset = {
  name: string;
  palette: PaletteName;
  beatSensitivity: number;
  starDensity: number;
  nebulaEnabled: boolean;
  volume: number;
};



