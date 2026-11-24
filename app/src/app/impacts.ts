import type { ImpactGroup, ImpactRow, Impacts, ImpactUnit } from '../data/types';
import { formatNumber, formatTemperature } from '../i18n/format';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
import { centredMean } from './milestones';

type Bound = 'mid' | 'low' | 'high';

/** The 20-year mean of a series at a year, as the IPCC defines a warming level; null without it. */
export const warmingAt = (
  years: readonly number[],
  values: readonly number[],
  year: number,
): number | null => {
  const i = years.indexOf(year);
  return i < 0 ? null : (centredMean(values)[i] ?? null);
};

const segment = (levels: readonly number[], t: number): number =>
  levels.findIndex((level, i) => level <= t && t <= (levels[i + 1] ?? -Infinity));

/** A value read on a straight line between the two levels around `t`; null outside the levels. */
export const interpolate = (
  levels: readonly number[],
  values: readonly number[],
  t: number,
): number | null => {
  const i = segment(levels, t);
  const [l0, l1] = [levels[i] ?? NaN, levels[i + 1] ?? NaN];
  const [v0, v1] = [values[i] ?? NaN, values[i + 1] ?? NaN];
  return i < 0 ? null : v0 + ((v1 - v0) * (t - l0)) / (l1 - l0);
};

export type Reading =
  | { kind: 'value'; mid: number | null; low: number | null; high: number | null }
  | { kind: 'atLeast'; level: number; value: number }
  | { kind: 'above' | 'below'; level: number };

const outside = (levels: readonly number[], t: number): Reading | null => {
  const [first, last] = [levels[0] ?? Infinity, levels.at(-1) ?? -Infinity];
  return t > last
    ? { kind: 'above', level: last }
    : t < first
      ? { kind: 'below', level: first }
      : null;
};

/** One row at a warming: each of its bounds read on its own, or the level it lies beyond. */
export const readRow = (levels: readonly number[], row: ImpactRow, t: number): Reading => {
  const bound = (b: Bound) => {
    const values = row[b];
    return values ? interpolate(levels, values, t) : null;
  };
  return (
    outside(levels, t) ?? {
      kind: 'value',
      mid: bound('mid'),
      low: bound('low'),
      high: bound('high'),
    }
  );
};

/** The warming each future reaches at the horizon, °C above 1850–1900. */
export interface Futures {
  baseline: number;
  scenario: number;
}

export interface RowReading {
  row: ImpactRow;
  /** Without the levers, then with them. */
  cells: readonly [Reading, Reading];
}

export interface GroupReading {
  group: ImpactGroup;
  rows: RowReading[];
}

/**
 * Above the top level of a source that stops there (`jointly`), at least its value at that
 * level: its impacts only grow with warming, so a future above keeps a figure to compare.
 */
const topValue = (group: ImpactGroup, row: ImpactRow): number | null => {
  const top = group.levels.length - 1;
  return row.mid?.[top] ?? row.low?.[top] ?? null;
};

const atLeast = (group: ImpactGroup, row: ImpactRow, reading: Reading): Reading => {
  const value = topValue(group, row);
  return group.jointly && reading.kind === 'above' && value !== null
    ? { kind: 'atLeast', level: reading.level, value }
    : reading;
};

/** A group's rows at both futures. */
export const readGroup = (group: ImpactGroup, futures: Futures): GroupReading => ({
  group,
  rows: group.rows.map((row) => ({
    row,
    cells: [
      atLeast(group, row, readRow(group.levels, row, futures.baseline)),
      atLeast(group, row, readRow(group.levels, row, futures.scenario)),
    ],
  })),
});

/** Both futures' warming at the horizon: the 20-year mean of each median; null outside the run. */
export const futuresAt = (
  temperature: ScenarioResult['temperature'],
  year: number,
): Futures | null => {
  const { years, baseline, scenario } = temperature;
  const [b, s] = [warmingAt(years, baseline.median, year), warmingAt(years, scenario.median, year)];
  return b === null || s === null ? null : { baseline: b, scenario: s };
};

export const readImpacts = (impacts: Impacts, futures: Futures): GroupReading[] =>
  impacts.groups.map((g) => readGroup(g, futures));

const DIGITS: Record<ImpactUnit, number> = { times: 1, percent: 0, perCentury: 0, megatonnes: 1 };

/** A number, or a range of two, in a unit: "4.1×", "3–14%". */
export const unitText = (t: T, locale: string, unit: ImpactUnit, ...values: number[]): string =>
  t(`impacts.units.${unit}`, {
    value: values.map((v) => formatNumber(locale, v, DIGITS[unit])).join('–'),
  });

const levelText = (locale: string, level: number) =>
  formatTemperature(locale, level, Number.isInteger(level) ? 0 : 1);

const rangeOf = (low: number | null, high: number | null): number[] =>
  low === null || high === null ? [] : [Math.min(low, high), Math.max(low, high)];

const limitText = (t: T, locale: string, r: { kind: 'above' | 'below'; level: number }) =>
  t(`impacts.${r.kind}`, { level: levelText(locale, r.level) });

/** What a cell says: the central value, else the range, at least the top level's, or a limit. */
export const cellText = (t: T, locale: string, unit: ImpactUnit, reading: Reading): string =>
  reading.kind === 'value'
    ? unitText(
        t,
        locale,
        unit,
        ...(reading.mid === null ? rangeOf(reading.low, reading.high) : [reading.mid]),
      )
    : reading.kind === 'atLeast'
      ? t('impacts.atLeast', { value: unitText(t, locale, unit, reading.value) })
      : limitText(t, locale, reading);

/** "1 °C, 1.5 °C, 2 °C, 3 °C and 4 °C" */
export const levelsText = (locale: string, levels: readonly number[]): string =>
  new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    levels.map((l) => levelText(locale, l)),
  );

/** The values a row was assessed at: "3–14% at 1.5 °C", one a level. */
const assessedText = (t: T, locale: string, group: ImpactGroup, row: ImpactRow): string =>
  t('impacts.assessed', {
    values: group.levels
      .map((level, i) => {
        const at = (b: Bound) => row[b]?.[i] ?? null;
        const value = at('mid');
        return t('impacts.atLevel', {
          value: unitText(
            t,
            locale,
            row.unit,
            ...(value === null ? rangeOf(at('low'), at('high')) : [value]),
          ),
          level: levelText(locale, level),
        });
      })
      .join(t('impacts.separator')),
  });

/** The source's range at each future, for a row that gives a central value and a range. */
const rangeText = (t: T, locale: string, group: ImpactGroup, r: RowReading): string => {
  const parts = r.cells.flatMap((c, i) =>
    c.kind === 'value' && c.mid !== null && c.low !== null && c.high !== null
      ? [
          t(i === 0 ? 'impacts.rangeWithout' : 'impacts.rangeWith', {
            range: unitText(t, locale, r.row.unit, ...rangeOf(c.low, c.high)),
          }),
        ]
      : [],
  );
  return parts.length === 0
    ? ''
    : t('impacts.range', {
        name: t(`impacts.groups.${group.id}.range`),
        parts: parts.join(t('impacts.separator')),
      });
};

/** The (i) of a row: what it counts, the values assessed, the source's range, the reference. */
export const rowInfo = (t: T, locale: string, group: ImpactGroup, r: RowReading): string[] =>
  [
    t(`impacts.rows.${r.row.id}.note`),
    assessedText(t, locale, group, r.row),
    rangeText(t, locale, group, r),
    r.cells.some((c) => c.kind === 'atLeast')
      ? t('impacts.atLeastNote', { level: levelText(locale, group.levels.at(-1) ?? 0) })
      : '',
    r.row.ref,
  ].filter(Boolean);
