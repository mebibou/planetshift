import type { Prepared } from '../../model/prepare';
import { memoPer } from '../../model/util';
import { option } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_POPULATION } from './data';
import {
  hasPopulation,
  VARIANTS,
  variantWorldPopulation,
  worldPopulation,
  type PopulationVariant,
  type WorldPopulation,
} from './model';

const ID = 'population';

declare module '../../model/api' {
  interface Options {
    population: PopulationVariant;
  }
  interface ScenarioResult {
    /** World population for the chart, with the variant chosen; null without the data. */
    population?: WorldPopulation | null;
  }
}

const worldCache = memoPer<Prepared, Record<number, number>>();

/**
 * The world's population to 2100, one of the UN's projections: a method option, not a lever. It
 * changes the baseline and the scenario alike (through the population baseline's scale), so the
 * warming avoided moves only because the farm emissions the levers act on are larger or smaller.
 */
export const population: LeverModule = {
  id: ID,
  levers: [],
  options: [option(ID, 'population', 'pop', VARIANTS)],
  files: [{ name: 'population', empty: EMPTY_POPULATION }],
  hooks: {
    population: ({ prepared, options }) => {
      const pop = prepared.data.population;
      return options.population !== 'medium' && hasPopulation(pop)
        ? worldCache(prepared, options.population, () =>
            variantWorldPopulation(
              prepared.data.countries,
              pop,
              options.population,
              prepared.baseYear,
            ),
          )
        : null;
    },
    world: ({ prepared, options }) => {
      const pop = prepared.data.population;
      return {
        result: {
          population: hasPopulation(pop)
            ? worldPopulation(
                pop,
                options.population,
                options.ssp,
                options.baseline === 'population',
              )
            : null,
        },
      };
    },
  },
  ui: {},
  methodology: { coveredBy: 'options' },
};
