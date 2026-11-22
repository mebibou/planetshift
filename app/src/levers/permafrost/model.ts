import type { GasVector, Permafrost } from '../../data/types';
import { towards } from '../../model/bands';
import type { Band } from '../../model/climate';
import { range } from '../../model/util';

const CH4_PER_C = 16 / 12;
const CO2_PER_C = 44 / 12;

/** kg of carbon released per °C of warming in the band's direction (p95: the most, as it warms most). */
export const kgCPerDegree = (permafrost: Permafrost, band: Band): number =>
  towards(permafrost.kgCPerDegree, band, true);

/**
 * kg of carbon released each year from `fromYear` to `toYear`: each year's rise in temperature
 * commits `perDegree` × the rise, released evenly over the next `releaseYears` years; a fall
 * commits nothing back. `temperature[i]` is the temperature in `firstYear + i`; warming before
 * `fromYear` still releases after it.
 */
export const carbonRelease = (
  temperature: readonly number[],
  firstYear: number,
  fromYear: number,
  toYear: number,
  perDegree: number,
  releaseYears: number,
): number[] => {
  const at = (y: number) => temperature[y - firstYear];
  const rise = (y: number) => {
    const [now, before] = [at(y), at(y - 1)];
    return now === undefined || before === undefined ? 0 : Math.max(0, now - before);
  };
  const years = Math.max(1, Math.round(releaseYears));
  return range(fromYear, toYear).map(
    (y) =>
      (perDegree / years) *
      range(y - years, y - 1).reduce((acc, committed) => acc + rise(committed), 0),
  );
};

/** Carbon released as gases, kg: `ch4Share` as methane, the rest as CO₂. */
export const releaseAsGases = (carbon: readonly number[], ch4Share: number): GasVector[] =>
  carbon.map((c) => ({
    co2: c * (1 - ch4Share) * CO2_PER_C,
    ch4: c * ch4Share * CH4_PER_C,
    n2o: 0,
  }));

/** The release, as gases, from a temperature path. */
export const permafrostEmissions = (
  permafrost: Permafrost,
  band: Band,
  temperature: readonly number[],
  firstYear: number,
  fromYear: number,
  toYear: number,
): GasVector[] =>
  releaseAsGases(
    carbonRelease(
      temperature,
      firstYear,
      fromYear,
      toYear,
      kgCPerDegree(permafrost, band),
      permafrost.releaseYears,
    ),
    permafrost.ch4Share,
  );
