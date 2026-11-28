import type { ScenarioResult } from '../model/api';

/** The families whose foods the Warming avoided chart stacks: the foods the levers shift. */
export const SHIFTED_FAMILIES = ['diet', 'plantFoods'] as const;

/** Below this every year, a food's band would not show. */
const SHOWN = 0.0005;

/** A food's band: its family, its food and its key in the rows. */
export interface FoodBand {
  key: string;
  family: string;
  food: string;
}

/** A year's warming avoided by each food (by its band's key), by the other levers, and in all. */
export type FoodRow = { year: number; other: number; total: number } & Record<string, number>;

/**
 * The warming avoided each year from `from` to `end` by each food the levers shift that shows,
 * the rest of the total as the other levers, and the total. No band when none shows.
 */
export const foodRows = (
  result: ScenarioResult,
  from: number,
  end: number,
): { bands: FoodBand[]; rows: FoodRow[] } => {
  const tp = result.temperature;
  const shown = tp.years.flatMap((year, i) => (year >= from && year <= end ? [{ year, i }] : []));
  const bands = SHIFTED_FAMILIES.flatMap((family) =>
    Object.entries(tp.avoidedByFood[family] ?? {})
      .filter(([, series]) => shown.some(({ i }) => Math.abs(series[i] ?? 0) >= SHOWN))
      .map(([food, series]) => ({ band: { key: `${family}.${food}`, family, food }, series })),
  );
  return {
    bands: bands.map((b) => b.band),
    rows: shown.map(({ year, i }) => {
      const total = tp.avoided.median[i] ?? 0;
      const foods = bands.map((b) => [b.band.key, b.series[i] ?? 0] as const);
      return {
        ...Object.fromEntries(foods),
        year,
        total,
        other: total - foods.reduce((s, [, v]) => s + v, 0),
      } as FoodRow;
    }),
  };
};
