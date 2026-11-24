import { departuresOf } from '../../config';
import { bandRecord } from '../../model/bands';
import { convolve, warmingFrom } from '../../model/climate';
import { addSeries, END_YEAR, range, zerosOn } from '../../model/util';
import { anyAdopted, lever } from '../define';
import type { LeverModule } from '../types';
import { energySpec } from './spec';
import type { Options } from '../../model/api';
import type { Prepared } from '../../model/prepare';
import type { Band } from '../../model/climate';
import {
  airPollutionPaths,
  airPollutionWarming,
  coChange,
  coGases,
  hasCoEmissions,
  type CoYear,
} from './coemissions';
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
};
const LEVERS = ENERGY_LEVERS.map((id) => lever(ID, id, KEYS[id]));

declare module '../../model/api' {
  interface Options {
    dataCentres: DataCentres;
  }
}

/** Warming from the data centres' demand beyond the SSP, from `dcStart` (option 'iea'). */
const dataCentreWarming = (
  prepared: Prepared,
  options: Options,
  band: Band,
  tYears: readonly number[],
  dcStart: number,
): number[] => {
  const { climate, sectors, coemissions } = prepared.data;
  const years = range(dcStart, END_YEAR);
  const co2 = dataCentreBaseline(sectors, options.ssp, 'iea', years, band);
  const co: CoYear[] = years.map((y, i) => {
    const electricity = { electricity: co2[i] as number };
    return { co2: electricity, change: coChange(coemissions, options.ssp, y, electricity) };
  });
  return addSeries(
    warmingFrom(coGases(co2, co), dcStart, climate, options.climate, band, tYears),
    airPollutionWarming(
      airPollutionPaths(
        coemissions,
        options.ssp,
        band,
        years,
        co,
        departuresOf(prepared.data).noxMethane,
      ),
      dcStart,
      forcingResponseOf(sectors, band),
      climate,
      options.climate,
      band,
      tYears,
    ),
  );
};

/**
 * The fossil CO₂ of transport, electricity and data centres, the methane and air pollution that
 * come with it, and aviation's non-CO₂ forcing; not farming. The air pollution is counted in its
 * own cause. Its option adds the data centres' demand beyond the SSP to the baseline.
 */
export const energy: LeverModule = {
  ...energySpec,
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
          departuresOf(prepared.data).aviationNonCo2,
        ),
      );
      const acting = anyAdopted(adoption, LEVERS);
      return {
        extraEmissions: bandRecord((band) => coGases(paths[band].co2, paths[band].co)),
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
                    airPollutionPaths(
                      coemissions,
                      options.ssp,
                      band,
                      years,
                      paths[band].co,
                      departuresOf(prepared.data).noxMethane,
                    ),
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
      const dcYears = prepared.data.sectors?.dataCentresTwh?.years ?? [];
      return {
        warming:
          options.dataCentres === 'iea' && dcYears.length > 0
            ? dataCentreWarming(prepared, options, band, tYears, dcYears[0] as number)
            : zerosOn(tYears),
      };
    },
  },
};
