export interface LegendBin {
  colour: string;
  label: string;
}

/** One entry per bin: "< a", "a–b", …, "≥ z". */
export const legendBins = (
  thresholds: number[],
  colours: string[],
  format: (v: number) => string,
): LegendBin[] => {
  if (!thresholds.length) return colours.slice(0, 1).map((colour) => ({ colour, label: '' }));
  const last = thresholds.length;
  return colours.slice(0, last + 1).map((colour, i) => ({
    colour,
    label:
      i === 0
        ? `< ${format(thresholds[0] ?? 0)}`
        : i === last
          ? `≥ ${format(thresholds[last - 1] ?? 0)}`
          : `${format(thresholds[i - 1] ?? 0)} – ${format(thresholds[i] ?? 0)}`,
  }));
};
