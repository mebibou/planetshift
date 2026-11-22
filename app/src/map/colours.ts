import type { Layer } from './layers';

const ramp = (name: string, n: number) =>
  Array.from({ length: n }, (_, i) => `var(--${name}-${i + 1})`);

/** Colours as CSS variables, so the theme changes them without repainting. */
export const LAYER_COLOURS: Record<Layer, string[]> = {
  production: ramp('seq-production', 7),
  emissions: ramp('seq-emissions', 7),
  land: ramp('seq-land', 7),
  deforestation: ramp('seq-deforestation', 7),
  change: ramp('diverging', 7),
  quality: ramp('tier', 6),
};

export const scaleKind = (layer: Layer): 'sequential' | 'diverging' | 'quality' =>
  layer === 'change' ? 'diverging' : layer === 'quality' ? 'quality' : 'sequential';
