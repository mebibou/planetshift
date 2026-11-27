import type { GasVector, Ssp } from '../../data/types';
import { dataValueAt } from '../../model/util';

/** The acids whose N₂O the lever abates. */
export const ACIDS = ['adipic', 'nitric'] as const;
export type Acid = (typeof ACIDS)[number];
export type ByAcid = Record<Acid, number>;

/**
 * acidn2o.json, on `years`: the N₂O from making adipic and nitric acid.
 * abated: the share of each acid's N₂O the lever removes at 100%.
 * emissions[ssp]: the world's under the SSP, kg a year (CEDS in `cedsYear`, moved as the SSP's
 * fossil and industrial N₂O).
 * byCountry[iso3]: each country's in `cedsYear`, kg.
 */
export interface AcidN2o {
  years: number[];
  cedsYear: number;
  abated: ByAcid;
  emissions: Record<Ssp, Record<Acid, number[]>>;
  byCountry: Record<string, ByAcid>;
  source: string;
}

export const EMPTY_ACID_N2O = {} as AcidN2o;

declare module '../../data/types' {
  interface ModelData {
    acidn2o: AcidN2o;
  }
}

export const ACID_N2O_LEVER = 'acidN2o';

/** Whether acidn2o.json was loaded with data for the lever to act on. */
export const hasAcidN2o = (a: Partial<AcidN2o> | undefined): a is AcidN2o =>
  a?.emissions !== undefined && Object.keys(a.emissions).length > 0;

/** kg of N₂O the scenario's acid plants emit in a year that `adoption` of the lever removes. */
export const acidN2oCut = (a: AcidN2o, ssp: Ssp, year: number, adoption: number): number =>
  adoption *
  ACIDS.reduce(
    (t, acid) => t + a.abated[acid] * dataValueAt(a.years, a.emissions[ssp][acid], year),
    0,
  );

const NONE: GasVector = { co2: 0, ch4: 0, n2o: 0, hfc: 0 };

/** The lever's change in N₂O each year, ramped like the others; none without the data. */
export const acidN2oPath = (
  a: Partial<AcidN2o> | undefined,
  adoption: number,
  ssp: Ssp,
  years: readonly number[],
  shareAt: (year: number) => number,
): GasVector[] =>
  years.map((y) =>
    hasAcidN2o(a) && adoption > 0
      ? { ...NONE, n2o: -acidN2oCut(a, ssp, y, adoption * shareAt(y)) }
      : NONE,
  );

/** Each year's gases with the lever's N₂O added. */
export const withAcidN2o = (gases: readonly GasVector[], acid: readonly GasVector[]): GasVector[] =>
  gases.map((g, i) => ({ ...g, n2o: g.n2o + (acid[i]?.n2o ?? 0) }));
