import { lever } from '../define';
import { hasSectors } from '../energy/data';
import type { LeverSpec } from '../types';
import { DAC_LEVER, DAC_SUMMARY_YEAR } from './data';

const ID = 'dac';

/**
 * Direct air capture with the CO₂ stored underground, on its own path rather than the shared
 * ramp; its plants run on the grid that renewable electricity leaves. Not farming.
 */
export const dacSpec: LeverSpec = {
  id: ID,
  family: 'dac',
  farm: false,
  cause: 'other',
  levers: [lever(ID, DAC_LEVER, 'dac')],
  options: [],
  files: [],
  available: (data) => hasSectors(data.sectors),
  ui: {
    section: 'levers',
    stat: ({ summary: s }, _, __, f) =>
      s.dacCo2.median > 0
        ? {
            label: f.t(`levers.${ID}.summary.title`, { year: DAC_SUMMARY_YEAR }),
            value: f.mass(s.dacCo2.median),
            detail: f.t(`levers.${ID}.summary.detail`, {
              low: f.mass(Math.min(s.dacCo2.p05, s.dacCo2.p95)),
              high: f.mass(Math.max(s.dacCo2.p05, s.dacCo2.p95)),
            }),
            className: 'stat-dac',
          }
        : null,
  },
  methodology: { page: 'dac' },
};
