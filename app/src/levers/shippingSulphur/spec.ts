import type { LeverSpec } from '../types';

const ID = 'shippingSulphur';

/**
 * The 2020 limit on ships' fuel sulphur as a forcing outside FaIR's calibrated ensemble, a
 * departure from FaIR that warms the baseline and the scenario alike; it reads the forcing
 * response of sectors.json, so without it the module does nothing.
 */
export const shippingSulphurSpec: LeverSpec = {
  id: ID,
  departure: 'shippingSulphur2020',
  levers: [],
  options: [],
  files: [],
  ui: {},
  methodology: { coveredBy: 'climate' },
};
