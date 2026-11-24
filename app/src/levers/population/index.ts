import type { Options } from '../../model/api';
import type { Prepared } from '../../model/prepare';
import { forcingResponseOf } from '../energy/model';
import { totalWarming } from '../../model/climate';
import type { LeverModule, PopulationContext } from '../types';
import { memoPer } from '../../model/util';
import { populationSpec } from './spec';
import {
  hasPopulation,
  variantWorldPopulation,
  worldPopulation,
  type PopulationVariant,
  type WorldPopulation,
} from './model';
import type { PopulationData } from './data';
import {
  BILLION,
  hasPeople,
  peopleFactor,
  peoplePath,
  peopleWarmingByCause,
  sspPopulation,
  worldMedium,
} from './people';

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

/** The UN projection chosen, by year; null for the medium one, the countries' own. */
const variantPath = (prepared: Prepared, options: Options): Record<number, number> | null => {
  const pop = prepared.data.population;
  return options.population !== 'medium' && hasPopulation(pop)
    ? worldCache(prepared, options.population, () =>
        variantWorldPopulation(prepared.data.countries, pop, options.population, prepared.baseYear),
      )
    : null;
};

const worldMediumOf = (prepared: Prepared, pop: PopulationData) =>
  worldCache(prepared, 'worldMedium', () => worldMedium(pop, prepared.baseYear));

/** The world's people-on-Earth path by year, when the thought experiment is on. */
const peopleOf = ({ prepared, options, currentYear }: PopulationContext) => {
  const pop = prepared.data.population;
  return options.people === undefined || !hasPopulation(pop)
    ? null
    : worldCache(prepared, `people:${options.people}:${options.peopleYear}:${currentYear}`, () =>
        peoplePath(
          worldMediumOf(prepared, pop),
          (options.people as number) * BILLION,
          currentYear,
          options.peopleYear,
        ),
      );
};

/** The people chosen over the UN's medium projection by year: what farm emissions follow. */
const farmFactorOf = (ctx: PopulationContext) => {
  const path = peopleOf(ctx);
  return path
    ? peopleFactor(worldMediumOf(ctx.prepared, ctx.prepared.data.population), path, ctx.currentYear)
    : null;
};

/**
 * The people chosen over the SSP's own population by year, that population taken to today's
 * count so nothing jumps now: every other emission is the SSP's per person times the people.
 */
const sspFactorOf = (ctx: PopulationContext) => {
  const path = peopleOf(ctx);
  const { prepared, options, currentYear } = ctx;
  const own =
    path && sspPopulation(prepared.data.people, options.ssp, prepared.baseYear, currentYear, path);
  return path
    ? peopleFactor(own ?? worldMediumOf(prepared, prepared.data.population), path, currentYear)
    : null;
};

/** The countries' own population by year times the people chosen over the medium projection. */
const countriesWithPeople = (ctx: PopulationContext) => {
  const factor = farmFactorOf(ctx);
  return factor
    ? Object.fromEntries(
        Object.entries(ctx.prepared.worldPopulation).map(([y, v]) => [y, v * factor(Number(y))]),
      )
    : null;
};

/**
 * The world's population to 2100, one of the UN's projections: a method option, not a lever. It
 * changes the baseline and the scenario alike (through the population baseline's scale), so the
 * warming avoided moves only because the farm emissions the levers act on are larger or smaller.
 * With `people` set, a number of people reached by the year every lever is in place takes its
 * place, and every human emission follows it.
 */
export const population: LeverModule = {
  ...populationSpec,
  hooks: {
    population: (ctx) => countriesWithPeople(ctx) ?? variantPath(ctx.prepared, ctx.options),
    people: sspFactorOf,
    baseline: ({ prepared, options, currentYear, band, tYears }) => {
      const factor = sspFactorOf({ prepared, options, currentYear });
      const { people, climate, coemissions, sectors } = prepared.data;
      const byCause =
        factor && hasPeople(people, options.ssp)
          ? peopleWarmingByCause(
              {
                people,
                climate,
                co: coemissions,
                response: forcingResponseOf(sectors, band),
                ssp: options.ssp,
                method: options.climate,
                band,
                currentYear,
                factor,
              },
              tYears,
            )
          : null;
      return { warming: byCause && totalWarming(byCause, tYears), byCause };
    },
    world: (ctx) => {
      const { prepared, options, currentYear } = ctx;
      const pop = prepared.data.population;
      const path = peopleOf({ prepared, options, currentYear });
      return {
        result: {
          population: hasPopulation(pop)
            ? worldPopulation(pop, path ? 'medium' : options.population, path)
            : null,
        },
      };
    },
  },
};
