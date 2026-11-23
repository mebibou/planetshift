import { bandRecord } from '../../model/bands';
import { netFreedHa, uptakeAsEmissions } from '../../model/land';
import type { LeverModule } from '../types';
import { regrowthSpec } from './spec';
import { regrowthPaths } from './model';

/** 'natural': freed farmland takes up CO₂ as vegetation grows back on it. */
export type Regrowth = 'none' | 'natural';

declare module '../../model/api' {
  interface Options {
    regrowth: Regrowth;
  }
  interface Summary {
    /**
     * CO₂ taken up by natural regrowth on freed land, net of the uptake forgone on land newly
     * used, in the year the shift is complete, kg a year, median and range; zero when regrowth
     * is off. It is already in `avoided.co2`.
     */
    regrowthCo2: { median: number; p05: number; p95: number };
  }
}

/** Natural regrowth on the farmland a shift frees: an option, counted as its own family. */
export const regrowth: LeverModule = {
  ...regrowthSpec,
  hooks: {
    world: ({ prepared, options }, { countries, years, shareAt, completeIndex }) => {
      const paths = regrowthPaths(
        options.regrowth === 'natural',
        countries.map((c) => ({ iso3: c.iso3, ha: netFreedHa(c.landChange) })),
        prepared.data.land,
        years,
        shareAt,
      );
      return {
        extraEmissions: bandRecord((band) => uptakeAsEmissions(paths[band])),
        summary: { regrowthCo2: bandRecord((band) => paths[band][completeIndex] ?? 0) },
      };
    },
  },
};
