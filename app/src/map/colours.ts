import type { Layer } from './layers';

const ramp = (name: string, n: number) =>
  Array.from({ length: n }, (_, i) => `var(--${name}-${i + 1})`);

/** Colours as CSS variables, so the theme changes them without repainting. */
export const LAYER_COLOURS: Record<Layer, string[]> = {
  production: ramp('seq-production', 7),
  emissions: ramp('seq-emissions', 7),
  land: ramp('seq-land', 7),
  deforestation: ramp('seq-deforestation', 7),
  landCo2: ramp('diverging', 7),
  mammals: ramp('seq-mammals', 7),
  change: ramp('diverging', 7),
  quality: ramp('tier', 6),
};

export type ScaleKind = 'sequential' | 'diverging' | 'net' | 'quality';

export const scaleKind = (layer: Layer): ScaleKind =>
  layer === 'change'
    ? 'diverging'
    : layer === 'landCo2'
      ? 'net'
      : layer === 'quality'
        ? 'quality'
        : 'sequential';
