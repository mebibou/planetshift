import type { Options } from '../../model/api';
import type { Prepared } from '../../model/prepare';
import { forcingResponseOf } from '../energy/model';
import { totalWarming } from '../../model/climate';
import type { LeverModule, PopulationContext, RunContext, WorldContext } from '../types';
import { bandRecord } from '../../model/bands';
import { addGas, gasVector, memoPer, ZERO_GAS } from '../../model/util';
import { populationSpec } from './spec';
import {
  fertilityLag,
  fewerChildren,
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

const FAMILY_PLANNING = 'familyPlanning';

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
 * The scenario's population over the baseline's with education and voluntary family planning;
 * none at 0, or with the low projection, which already has half a child fewer.
 */
const fewerOf = ({ prepared, scenario, options, currentYear, adoption }: RunContext) => {
  const pop = prepared.data.population;
  const a = adoption(FAMILY_PLANNING);
  return a > 0 && options.population !== 'low' && options.people === undefined && hasPopulation(pop)
    ? fewerChildren(pop, a, fertilityLag(pop, scenario.rampEnd, currentYear))
    : null;
};

/** The farm emissions fewer people need, kg a year: the baseline's times the ratio, less one. */
const fewerEmissions = (w: WorldContext, fewer: (year: number) => number) => {
  const base = w.countries.reduce((a, c) => addGas(a, c.emissions), ZERO_GAS);
  const path = w.years.map((y) =>
    gasVector((g) => base[g] * w.baselineScale(g, y) * (fewer(y) - 1)),
  );
  return bandRecord(() => path);
};

/**
 * The world's population to 2100, one of the UN's projections: a method option, not a lever. It
 * changes the baseline and the scenario alike (through the population baseline's scale), so the
 * warming avoided moves only because the farm emissions the levers act on are larger or smaller.
 * With `people` set (a prototype behind ?popctl=people), a number of people reached in 2050 takes
 * its place, and every human emission follows it.
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
    scenarioScale: fewerOf,
    world: (ctx, w) => {
      const { prepared, options, currentYear } = ctx;
      const pop = prepared.data.population;
      const path = peopleOf({ prepared, options, currentYear });
      const fewer = fewerOf(ctx);
      return {
        ...(fewer && { extraEmissions: fewerEmissions(w, fewer) }),
        result: {
          population: hasPopulation(pop)
            ? worldPopulation(
                pop,
                path ? 'medium' : options.population,
                options.ssp,
                options.baseline === 'population' || path !== null,
                path,
              )
            : null,
        },
      };
    },
  },
};
