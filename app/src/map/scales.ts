import { scaleThreshold } from 'd3';
import type { ScaleKind } from './colours';

/** The power of ten a value is rounded to, to keep `digits` significant figures. */
const magnitudeOf = (x: number, digits: number): number =>
  10 ** (Math.floor(Math.log10(Math.abs(x))) - digits + 1);

export const roundSignificant = (x: number, digits = 1): number =>
  x === 0 || !Number.isFinite(x)
    ? x
    : Math.round(x / magnitudeOf(x, digits)) * magnitudeOf(x, digits);

/** Smallest 1-2-5 number at or above x. */
export const niceCeil = (x: number): number => {
  const power = 10 ** Math.floor(Math.log10(x));
  return x <= 0
    ? 0
    : ([1, 2, 5, 10].map((m) => m * power).find((v) => v >= x * (1 - 1e-12)) ?? 10 * power);
};

/** n − 1 thresholds evenly spaced in log space between min and max, rounded for the legend. */
export const logThresholds = (min: number, max: number, n: number): number[] => {
  const [lo, hi] = [Math.log10(min), Math.log10(max)];
  const raw =
    min > 0 && max > min
      ? Array.from({ length: n - 1 }, (_, i) =>
          roundSignificant(10 ** (lo + ((hi - lo) * (i + 1)) / n)),
        )
      : [];
  return raw.filter((v, i) => i === 0 || v > (raw[i - 1] ?? 0));
};

/**
 * Relative change: seven fixed bins, symmetric around zero, with a neutral middle bin. Fixed,
 * not stretched to the largest change, so a bigger shift shows as stronger colours.
 */
export const CHANGE_THRESHOLDS = [-0.4, -0.15, -0.02, 0.02, 0.15, 0.4];

/** Net CO₂, kg a year: sinks and sources by ±1, 10 and 100 Mt, the middle bin about nothing. */
export const NET_THRESHOLDS = [-1e11, -1e10, -1e9, 1e9, 1e10, 1e11];

/** A fire season against its mean: bins symmetric as ratios (×0.5 and ×2), not as shares. */
export const FIRE_ANOMALY_THRESHOLDS = [-0.5, -0.2, -0.1, 0.1, 0.25, 1];

export const QUALITY_THRESHOLDS = [1.5, 2.5, 3.5, 4.5, 5.5];

/** The share of a country's land that is farmed: fixed bins, the same for every scenario. */
export const LAND_SHARE_THRESHOLDS = [0.05, 0.1, 0.2, 0.3, 0.45, 0.6];

/** Farmed mammals, tonnes of live weight per km² of land: fixed bins, as for the land share. */
export const MAMMAL_THRESHOLDS = [1, 2.5, 5, 10, 20, 40];

/** Species committed to extinction by a country's farmland: fixed bins, as for the mammals. */
export const SPECIES_THRESHOLDS = [25, 100, 250, 500, 1000, 2500];

/** Species committed per Mha of farmland: fixed bins. */
export const SPECIES_DENSITY_THRESHOLDS = [2.5, 5, 10, 25, 50, 100];

export const thresholdsFor = (kind: ScaleKind, values: number[], bins: number): number[] => {
  const positive = values.filter((v) => v > 0);
  return kind === 'quality'
    ? QUALITY_THRESHOLDS
    : kind === 'net'
      ? NET_THRESHOLDS
      : kind === 'diverging'
        ? CHANGE_THRESHOLDS
        : logThresholds(Math.min(...positive), Math.max(...positive), bins);
};

export const colourScale = (thresholds: number[], colours: string[]) =>
  scaleThreshold<number, string>()
    .domain(thresholds)
    .range(colours.slice(0, thresholds.length + 1));

/** For a sequential scale with fewer thresholds than colours, spread the colours over the bins. */
export const pickColours = (colours: string[], bins: number): string[] =>
  bins >= colours.length || bins <= 1
    ? colours.slice(0, Math.max(bins, 1))
    : Array.from(
        { length: bins },
        (_, i) => colours[Math.round((i * (colours.length - 1)) / (bins - 1))] ?? '',
      );
