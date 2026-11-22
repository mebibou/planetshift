import { warmingFrom } from '../../model/climate';
import { addSeries, END_YEAR, FIRST_YEAR, subtractPaths } from '../../model/util';
import type { GasVector } from '../../data/types';
import { option } from '../define';
import type { LeverModule } from '../types';
import { permafrostEmissions } from './model';

const ID = 'permafrost';

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

/**
 * Permafrost carbon released as the world warms: an option that warms the baseline, and whose
 * change with the scenario is shared out between the families in proportion to their warming.
 */
export const permafrost: LeverModule = {
  id: ID,
  levers: [],
  options: [option(ID, 'permafrost', 'pf', ['off', 'on'])],
  files: [],
  hooks: {
    baseline: ({ prepared, options, currentYear, band, tYears, temperature }) => {
      const { climate } = prepared.data;
      const release =
        options.permafrost === 'on' && climate.permafrost
          ? permafrostEmissions(
              climate.permafrost,
              band,
              temperature,
              FIRST_YEAR,
              currentYear,
              END_YEAR,
            )
          : [];
      const memo: Memo = { before: temperature, release };
      return {
        warming:
          release.length > 0
            ? warmingFrom(release, currentYear, climate, options.climate, band, tYears)
            : null,
        memo,
      };
    },
    feedback: ({ prepared, options, currentYear, band, tYears, memo, delta }) => {
      const { climate } = prepared.data;
      const { before, release } = memo as Memo;
      return options.permafrost === 'on' && climate.permafrost
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
  ui: {},
  methodology: { coveredBy: 'climate' },
};
