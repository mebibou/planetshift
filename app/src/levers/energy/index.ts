import { departuresOf } from '../../config';
import { bandRecord } from '../../model/bands';
import { convolve, warmingFrom } from '../../model/climate';
import { addSeries, END_YEAR, range, zerosOn } from '../../model/util';
import { anyAdopted, lever, option } from '../define';
import type { LeverModule } from '../types';
import {
  airPollutionPaths,
  airPollutionWarming,
  coChange,
  coGases,
  hasCoEmissions,
  type CoYear,
} from './coemissions';
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
      const { climate, sectors, coemissions } = prepared.data;
      const dcYears = sectors?.dataCentresTwh?.years ?? [];
      if (options.dataCentres !== 'iea' || dcYears.length === 0)
        return { warming: zerosOn(tYears) };
      const dcStart = dcYears[0] as number;
      const years = range(dcStart, END_YEAR);
      const co2 = dataCentreBaseline(sectors, options.ssp, 'iea', years, band);
      const co: CoYear[] = years.map((y, i) => {
        const electricity = { electricity: co2[i] as number };
        return { co2: electricity, change: coChange(coemissions, options.ssp, y, electricity) };
      });
      return {
        warming: addSeries(
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
        ),
      };
    },
  },
  ui: { section: 'levers' },
  methodology: { page: 'sectors' },
};
