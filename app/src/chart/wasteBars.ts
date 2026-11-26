import {
  INCOME_GROUPS,
  WASTE_TREATMENTS,
  WASTE_TYPES,
  type OceanPlastic,
  type SolidWaste,
  type SolidWasteCountry,
} from '../data/types';
import { FOOD_STAGES } from '../levers/waste/foodWaste';
import type { CountryResult } from '../model/api';
import type { WasteView } from '../app/url';

/** One stacked bar of the Waste chart: its parts, tonnes a year, in stacking order. */
export interface WasteBar {
  key: string;
  parts: { key: string; tonnes: number }[];
}

export const barTotal = (bar: WasteBar): number => bar.parts.reduce((a, p) => a + p.tonnes, 0);

const sumOf = <T>(rows: readonly T[], value: (row: T) => number): number =>
  rows.reduce((a, r) => a + value(r), 0);

/** The world's food lost and wasted by stage, today and with the levers in place. */
export const foodBars = (countries: readonly CountryResult[]): WasteBar[] => [
  {
    key: 'today',
    parts: FOOD_STAGES.map((s) => ({
      key: s,
      tonnes: sumOf(countries, (c) => c.foodWaste?.[s] ?? 0),
    })),
  },
  {
    key: 'levers',
    parts: FOOD_STAGES.map((s) => ({
      key: s,
      tonnes: sumOf(countries, (c) => (c.foodWaste?.[s] ?? 0) + (c.foodWasteChange?.[s] ?? 0)),
    })),
  },
];

type MunicipalView = Exclude<WasteView, 'food'>;

const PARTS: Record<MunicipalView, readonly string[]> = {
  types: WASTE_TYPES,
  treatment: WASTE_TREATMENTS,
};

const shareOf = (c: SolidWasteCountry, view: MunicipalView, key: string): number =>
  (view === 'types'
    ? c.types[key as keyof SolidWasteCountry['types']]
    : c.treatment[key as keyof SolidWasteCountry['treatment']]) ?? 0;

/**
 * Municipal solid waste by type or treatment: the world's, then each income group's, every
 * country of solidwaste.json counted.
 */
export const municipalBars = (file: SolidWaste | undefined, view: MunicipalView): WasteBar[] => {
  const countries = Object.values(file?.byCountry ?? {});
  const groups = [
    { key: 'world', rows: countries },
    ...INCOME_GROUPS.map((g) => ({ key: g, rows: countries.filter((c) => c.income === g) })),
  ];
  return countries.length
    ? groups.map(({ key, rows }) => ({
        key,
        parts: PARTS[view].map((p) => ({
          key: p,
          tonnes: sumOf(rows, (c) => c.tonnes * shareOf(c, view, p)),
        })),
      }))
    : [];
};

/** The bars a view of the Waste chart draws. */
export const wasteBars = (
  view: WasteView,
  countries: readonly CountryResult[],
  file: SolidWaste | undefined,
): WasteBar[] => (view === 'food' ? foodBars(countries) : municipalBars(file, view));

/** The world's plastic reaching the ocean through rivers, tonnes a year; null without the file. */
export const oceanPlasticTotal = (file: OceanPlastic | undefined): number | null =>
  file ? sumOf(Object.values(file.byCountry), (t) => t) : null;
