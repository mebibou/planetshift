import { scaleThreshold } from 'd3';

export const roundSignificant = (x: number, digits = 1): number => {
  if (x === 0 || !Number.isFinite(x)) return x;
  const magnitude = 10 ** (Math.floor(Math.log10(Math.abs(x))) - digits + 1);
  return Math.round(x / magnitude) * magnitude;
};

/** Smallest 1-2-5 number at or above x. */
export const niceCeil = (x: number): number => {
  if (x <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(x));
  return [1, 2, 5, 10].map((m) => m * power).find((v) => v >= x * (1 - 1e-12)) ?? 10 * power;
};

/** n − 1 thresholds evenly spaced in log space between min and max, rounded for the legend. */
export const logThresholds = (min: number, max: number, n: number): number[] => {
  if (!(min > 0) || !(max > min)) return [];
  const [lo, hi] = [Math.log10(min), Math.log10(max)];
  const raw = Array.from({ length: n - 1 }, (_, i) =>
    roundSignificant(10 ** (lo + ((hi - lo) * (i + 1)) / n)),
  );
  return raw.filter((v, i) => i === 0 || v > (raw[i - 1] ?? 0));
};

/**
 * Relative change: seven fixed bins, symmetric around zero, with a neutral middle bin. Fixed,
 * not stretched to the largest change, so a bigger shift shows as stronger colours.
 */
export const CHANGE_THRESHOLDS = [-0.4, -0.15, -0.02, 0.02, 0.15, 0.4];

export const QUALITY_THRESHOLDS = [1.5, 2.5, 3.5, 4.5, 5.5];

/** The share of a country's land that is farmed: fixed bins, the same for every scenario. */
export const LAND_SHARE_THRESHOLDS = [0.05, 0.1, 0.2, 0.3, 0.45, 0.6];

export const thresholdsFor = (
  kind: 'sequential' | 'diverging' | 'quality',
  values: number[],
  bins: number,
): number[] => {
  if (kind === 'quality') return QUALITY_THRESHOLDS;
  if (kind === 'diverging') return CHANGE_THRESHOLDS;
  const positive = values.filter((v) => v > 0);
  return positive.length ? logThresholds(Math.min(...positive), Math.max(...positive), bins) : [];
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
