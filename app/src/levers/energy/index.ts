import { bandRecord } from '../../model/bands';
import { agtpOf, convolve } from '../../model/climate';
import { END_YEAR, range, zerosOn } from '../../model/util';
import { anyAdopted, lever, option } from '../define';
import type { LeverModule } from '../types';
import { airPollutionPaths, airPollutionWarming, hasCoEmissions, type CoYear } from './coemissions';
import { EMPTY_COEMISSIONS, EMPTY_SECTORS } from './data';
import {
  dataCentreBaseline,
  ENERGY_LEVERS,
  energyPaths,
  forcingResponseOf,
  type DataCentres,
  type EnergyLever,
} from './model';

const ID = 'energy';
const KEYS: Record<EnergyLever, string> = {
  electricCars: 'ev',
  electricTrucks: 'et',
  flyLess: 'fl',
  cleanAviationFuel: 'saf',
  cleanShipping: 'cs',
  renewableElectricity: 're',
  cleanDataCentres: 'cdc',
};
const LEVERS = ENERGY_LEVERS.map((id) => lever(ID, id, KEYS[id]));

declare module '../../model/api' {
  interface Options {
    dataCentres: DataCentres;
  }
}

/**
 * The fossil CO₂ of transport, electricity and data centres, the methane and air pollution that
 * come with it, and aviation's non-CO₂ forcing; not farming. The air pollution is counted in its
 * own cause. Its option adds the data centres' demand beyond the SSP to the baseline.
 */
export const energy: LeverModule = {
  id: ID,
  family: 'energy',
  farm: false,
  cause: 'fossilIndustry',
  levers: LEVERS,
  options: [option(ID, 'dataCentres', 'dc', ['iea', 'ssp'])],
  files: [
    { name: 'sectors', empty: EMPTY_SECTORS },
    { name: 'coemissions', empty: EMPTY_COEMISSIONS },
  ],
  available: (data) => Object.keys(data.sectors?.co2 ?? {}).length > 0,
  hooks: {
    world: ({ prepared, options, adoption, currentYear }, { years, tYears, shareAt }) => {
      const { sectors, coemissions, climate } = prepared.data;
      const paths = bandRecord((band) =>
        energyPaths(
          sectors,
          coemissions,
          adoption,
          options.ssp,
          options.dataCentres,
          band,
          years,
          shareAt,
        ),
      );
      const acting = anyAdopted(adoption, LEVERS);
      return {
        extraEmissions: bandRecord((band) =>
          paths[band].co2.map((co2, i) => ({
            co2,
            ch4: (paths[band].co[i] as CoYear).change.ch4,
            n2o: 0,
          })),
        ),
        extraWarming: acting
          ? bandRecord((band) =>
              convolve(paths[band].forcing, currentYear, forcingResponseOf(sectors, band), tYears),
            )
          : null,
        warmingByCause:
          acting && hasCoEmissions(coemissions)
            ? {
                airPollution: bandRecord((band) =>
                  airPollutionWarming(
                    airPollutionPaths(coemissions, options.ssp, band, years, paths[band].co),
                    currentYear,
                    forcingResponseOf(sectors, band),
                    climate,
                    options.climate,
                    band,
                    tYears,
                  ),
                ),
              }
            : {},
      };
    },
    baseline: ({ prepared, options, band, tYears }) => {
      const { climate, sectors } = prepared.data;
      const dcYears = sectors?.dataCentresTwh?.years ?? [];
      const dcStart = dcYears[0] ?? END_YEAR;
      return {
        warming:
          options.dataCentres === 'iea' && dcYears.length > 0
            ? convolve(
                dataCentreBaseline(sectors, options.ssp, 'iea', range(dcStart, END_YEAR), band),
                dcStart,
                agtpOf(climate, options.climate, 'co2', band),
                tYears,
              )
            : zerosOn(tYears),
      };
    },
  },
  ui: { section: 'levers' },
  methodology: { page: 'sectors' },
};
