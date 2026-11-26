import type { CountryResult } from '../../model/api';
import { bandRecord } from '../../model/bands';
import { gasVector } from '../../model/util';
import type { LeverModule } from '../types';
import { hasWasteMethane, type BySector } from './data';
import { columnsOf, countryWasteMethane, factorsOf, foodChange, wasteMethanePath } from './model';
import { wasteMethaneSpec } from './spec';

/** Each country's food levers' change in its waste methane, kg a year. */
const foodOf = (countries: readonly CountryResult[]) =>
  new Map<string, BySector>(
    countries.flatMap((c) => (c.wasteMethane ? [[c.iso3, c.wasteMethane.food]] : [])),
  );

const tonnesOf = (change: ArrayLike<number> | undefined): number =>
  Array.from(change ?? []).reduce((a, t) => a + t, 0);

/**
 * Landfill gas captured, organic waste kept out of landfills and wastewater treated. Its country
 * hook gives each country's waste methane and the food levers' change in it, which its world hook
 * leaves out of what it cuts.
 */
export const wasteMethane: LeverModule = {
  ...wasteMethaneSpec,
  hooks: {
    country: ({ prepared, adoption }) => {
      const file = prepared.data.wastemethane;
      const a = { landfills: adoption('landfills'), wastewater: adoption('wastewater') };
      return hasWasteMethane(file)
        ? ({ pc, stages }) => {
            const iso3 = pc.country.iso3;
            const row = file.byCountry[iso3];
            const food = foodChange(prepared.data.chain, iso3, tonnesOf(stages.at(-1)?.change));
            return {
              result: {
                ...(row && {
                  wasteMethane: countryWasteMethane(row, food, factorsOf(file, 'median'), a),
                }),
              },
            };
          }
        : null;
    },
    world: ({ prepared, options, adoption }, { countries, years, shareAt, baselineScale }) => {
      const file = prepared.data.wastemethane;
      const a = { landfills: adoption('landfills'), wastewater: adoption('wastewater') };
      const acts = hasWasteMethane(file) && (a.landfills > 0 || a.wastewater > 0);
      const columns = acts ? columnsOf(file, foodOf(countries)) : null;
      return columns
        ? {
            extraEmissions: bandRecord((band) =>
              wasteMethanePath({
                file,
                ssp: options.ssp,
                band,
                years,
                shareAt,
                adoption: a,
                columns,
                foodScale: (year) => baselineScale('ch4', year),
              }).map((ch4) => gasVector((g) => (g === 'ch4' ? ch4 : 0))),
            ),
          }
        : {};
    },
  },
};
