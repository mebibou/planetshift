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
  const last = thresholds.length;
  const at = (j: number) => format(thresholds[j] ?? 0);
  const label = (i: number) =>
    i === 0 ? `< ${at(0)}` : i === last ? `≥ ${at(last - 1)}` : `${at(i - 1)} – ${at(i)}`;
  return last
    ? colours.slice(0, last + 1).map((colour, i) => ({ colour, label: label(i) }))
    : colours.slice(0, 1).map((colour) => ({ colour, label: '' }));
};
