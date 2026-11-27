import type { Layer, LayerSpec } from './layers';

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
  species: ramp('seq-species', 7),
  water: ramp('seq-water', 7),
  waterScarcity: ramp('seq-water', 7),
  waste: ramp('seq-waste', 7),
  fossilMethane: ramp('seq-emissions', 7),
  fires: ramp('diverging', 7),
  change: ramp('diverging', 7),
  quality: ramp('tier', 6),
};

export type ScaleKind = 'sequential' | 'diverging' | 'net' | 'quality';

const KINDS: Partial<Record<Layer, ScaleKind>> = {
  change: 'diverging',
  fires: 'diverging',
  landCo2: 'net',
  quality: 'quality',
};

export const scaleKind = (layer: Layer): ScaleKind => KINDS[layer] ?? 'sequential';

/** The fires layer's carbon is a quantity, unlike its two anomalies. */
const FIRE_CARBON = { kind: 'sequential' as ScaleKind, colours: ramp('seq-emissions', 7) };

/** A layer's scale kind and colours, for the choice it shows. */
export const scaleOf = (spec: Pick<LayerSpec, 'layer' | 'firesOf'>) =>
  spec.layer === 'fires' && spec.firesOf === 'carbon'
    ? FIRE_CARBON
    : { kind: scaleKind(spec.layer), colours: LAYER_COLOURS[spec.layer] };
