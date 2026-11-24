import { departs } from '../../config';
import { convolve } from '../../model/climate';
import { END_YEAR } from '../../model/util';
import { forcingResponseOf } from '../energy/model';
import type { LeverModule } from '../types';
import { shippingSulphurSpec } from './spec';
import { shippingForcing } from './model';

/**
 * The 2020 limit on ships' fuel sulphur as a forcing outside FaIR's calibrated ensemble, a
 * departure from FaIR that warms the baseline and the scenario alike; it reads the forcing
 * response of sectors.json, so without it the module does nothing.
 */
export const shippingSulphur: LeverModule = {
  ...shippingSulphurSpec,
  hooks: {
    baseline: ({ prepared, options, band, tYears }) => {
      const { climate, sectors } = prepared.data;
      const s = climate.shippingSulphur2020;
      const response = forcingResponseOf(sectors, band);
      const warming =
        s && response.length > 0 && departs(prepared.data, 'shippingSulphur2020')
          ? convolve(
              shippingForcing(s, options.ssp, band, END_YEAR),
              s.years[0] as number,
              response,
              tYears,
            )
          : null;
      return { warming, byCause: warming && { byCause: { airPollution: warming }, byGas: {} } };
    },
  },
};
