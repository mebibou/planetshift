import { departs } from '../../config';
import { sumOfGases, warmingByGas, warmingFrom, type Band } from '../../model/climate';
import { addSeries, END_YEAR, FIRST_YEAR, subtractPaths } from '../../model/util';
import {
  GASES,
  type CauseWarming,
  type Gas,
  type GasVector,
  type ModelData,
} from '../../data/types';
import type { LeverModule } from '../types';
import { permafrostSpec } from './spec';
import { permafrostEmissions } from './model';

/** 'on': permafrost releases carbon as the world warms (climate.md), in the baseline and the scenario. */
export type PermafrostOption = 'off' | 'on';

declare module '../../model/api' {
  interface Options {
    permafrost: PermafrostOption;
  }
}

interface Memo {
  /** The baseline temperature before the release. */
  before: readonly number[];
  /** The release on the baseline, kg by gas, current year..END_YEAR (empty when off). */
  release: GasVector[];
}

/** The release on a temperature path, kg by gas, current year..END_YEAR; empty when off. */
const releaseOf = (
  data: ModelData,
  option: PermafrostOption,
  band: Band,
  temperature: readonly number[],
  currentYear: number,
): GasVector[] =>
  option === 'on' && data.climate.permafrost && departs(data, 'permafrost')
    ? permafrostEmissions(
        data.climate.permafrost,
        band,
        temperature,
        FIRST_YEAR,
        currentYear,
        END_YEAR,
      )
    : [];

const ownCause = (byGas: Record<Gas, number[]>): CauseWarming => ({
  byCause: { permafrost: sumOfGases(byGas) },
  byGas: Object.fromEntries(
    GASES.filter((g) => byGas[g].some((v) => v !== 0)).map((g) => [g, { permafrost: byGas[g] }]),
  ),
});

/**
 * Permafrost carbon released as the world warms: an option that warms the baseline, and whose
 * change with the scenario is shared out between the families in proportion to their warming.
 */
export const permafrost: LeverModule = {
  ...permafrostSpec,
  hooks: {
    baseline: ({ prepared, options, currentYear, band, tYears, temperature }) => {
      const { climate } = prepared.data;
      const release = releaseOf(prepared.data, options.permafrost, band, temperature, currentYear);
      const memo: Memo = { before: temperature, release };
      const byCause =
        release.length > 0
          ? ownCause(warmingByGas(release, currentYear, climate, options.climate, band, tYears))
          : null;
      return { warming: byCause?.byCause.permafrost ?? null, byCause, memo };
    },
    feedback: ({ prepared, options, currentYear, band, tYears, memo, delta }) => {
      const { climate } = prepared.data;
      const { before, release } = memo as Memo;
      return options.permafrost === 'on' &&
        climate.permafrost &&
        departs(prepared.data, 'permafrost')
        ? warmingFrom(
            subtractPaths(
              permafrostEmissions(
                climate.permafrost,
                band,
                addSeries(before, delta),
                FIRST_YEAR,
                currentYear,
                END_YEAR,
              ),
              release,
            ),
            currentYear,
            climate,
            options.climate,
            band,
            tYears,
          )
        : null;
    },
  },
};
