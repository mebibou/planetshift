import { lever, option } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_COEMISSIONS, EMPTY_SECTORS } from './data';
import { ENERGY_LEVERS, type DataCentres, type EnergyLever } from './data';

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

/**
 * The fossil CO₂ of transport, electricity and data centres, the methane and air pollution that
 * come with it, and aviation's non-CO₂ forcing; not farming. The air pollution is counted in its
 * own cause. Its option adds the data centres' demand beyond the SSP to the baseline.
 */
export const energySpec: LeverSpec = {
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
  ui: { section: 'levers' },
  methodology: { page: 'sectors' },
};
