import { bandRecord } from '../../model/bands';
import { convolve } from '../../model/climate';
import { forcingResponseOf } from '../energy/model';
import { netFreedHa, uptakeAsEmissions } from '../../model/land';
import { speciesRegained } from '../../model/species';
import type { LeverModule } from '../types';
import { regrowthSpec } from './spec';
import { albedoForcingPath, fullUptake, regrowthPaths } from './model';

/** 'natural': freed farmland takes up CO₂ as vegetation grows back on it. */
export type Regrowth = 'none' | 'natural';

declare module '../../model/api' {
  interface Options {
    regrowth: Regrowth;
  }
  interface CountryResult {
    /** CO₂ the country's freed farmland takes up as it regrows, net, kg a year; regrowth on only. */
    regrowthCo2?: number;
    /** Species the freed farmland gives back once grown back; regrowth on only. */
    speciesRegained?: number;
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
    country: ({ prepared, options }) =>
      options.regrowth === 'natural'
        ? ({ pc, landChange }) => ({
            result: {
              regrowthCo2: fullUptake(
                [{ iso3: pc.country.iso3, ha: netFreedHa(landChange) }],
                prepared.data.land,
                'median',
              ),
              speciesRegained: speciesRegained(
                prepared.data.species?.byCountry[pc.country.iso3],
                landChange,
              ),
            },
          })
        : null,
    world: (
      { prepared, options, currentYear },
      { countries, years, tYears, shareAt, completeIndex },
    ) => {
      const natural = options.regrowth === 'natural';
      const net = countries.map((c) => ({ iso3: c.iso3, ha: netFreedHa(c.landChange) }));
      const { land, sectors } = prepared.data;
      const paths = regrowthPaths(natural, net, land, years, shareAt);
      const albedo =
        natural && land.albedoPerHa
          ? albedoForcingPath(net, land.albedoPerHa, years, shareAt, land.regrowthYears)
          : null;
      return {
        extraEmissions: bandRecord((band) => uptakeAsEmissions(paths[band])),
        warmingByCause: albedo
          ? {
              landAlbedo: bandRecord((band) =>
                convolve(albedo, currentYear, forcingResponseOf(sectors, band), tYears),
              ),
            }
          : undefined,
        summary: { regrowthCo2: bandRecord((band) => paths[band][completeIndex] ?? 0) },
      };
    },
  },
};
