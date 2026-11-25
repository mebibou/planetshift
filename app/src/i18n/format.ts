const MINUS = '−';
const NBSP = ' ';

export const fixMinus = (text: string): string => text.replace(/-/g, MINUS);

export const formatNumber = (locale: string, value: number, maxDigits = 1): string =>
  fixMinus(new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits }).format(value));

export const formatSignificant = (locale: string, value: number, digits = 3): string =>
  fixMinus(new Intl.NumberFormat(locale, { maximumSignificantDigits: digits }).format(value));

export const formatSigned = (locale: string, value: number, digits = 2): string =>
  fixMinus(
    new Intl.NumberFormat(locale, {
      signDisplay: 'exceptZero',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value),
  );

export const formatPercent = (locale: string, fraction: number, digits = 0, signed = false) =>
  fixMinus(
    new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: digits,
      signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(fraction),
  );

export interface MassUnit {
  factor: number; // kg per unit
  unit: string;
}

const MASS_UNITS: MassUnit[] = [
  { factor: 1e12, unit: 'Gt' },
  { factor: 1e9, unit: 'Mt' },
  { factor: 1e6, unit: 'kt' },
  { factor: 1e3, unit: 't' },
];

/** The largest unit in which |kg| is at least 1. */
export const massUnit = (kg: number): MassUnit =>
  MASS_UNITS.find((u) => Math.abs(kg) >= u.factor) ?? { factor: 1, unit: 'kg' };

export const formatMass = (locale: string, kg: number, unit = massUnit(kg)): string =>
  `${formatSignificant(locale, kg / unit.factor, 3)}${NBSP}${unit.unit}`;

export const formatSignedMass = (locale: string, kg: number, unit = massUnit(kg)): string =>
  `${kg > 0 ? '+' : ''}${formatMass(locale, kg, unit)}`;

const AREA_UNITS: { factor: number; unit: string }[] = [
  { factor: 1e6, unit: 'Mha' },
  { factor: 1e3, unit: 'kha' },
];

/** Hectares in the largest unit in which |ha| is at least 1. */
export const formatArea = (locale: string, ha: number): string => {
  const { factor, unit } = AREA_UNITS.find((u) => Math.abs(ha) >= u.factor) ?? {
    factor: 1,
    unit: 'ha',
  };
  return `${formatSignificant(locale, ha / factor, 3)}${NBSP}${unit}`;
};

/** Tonnes per km², as farmed mammals' live weight per km² of land. */
export const formatPerKm2 = (locale: string, tonnes: number): string =>
  `${formatSignificant(locale, tonnes, 2)}${NBSP}t/km²`;

const SPECIES_WORD: Record<string, string> = { fr: 'espèces' };
const speciesWord = (locale: string): string => SPECIES_WORD[locale.slice(0, 2)] ?? 'species';

/** A count of species, two significant figures, with its unit. */
export const formatSpecies = (locale: string, n: number): string =>
  `${formatSignificant(locale, n, 2)}${NBSP}${speciesWord(locale)}`;

/** Species per Mha of farmland. */
export const formatSpeciesPerMha = (locale: string, n: number): string =>
  `${formatSignificant(locale, n, 2)}${NBSP}${speciesWord(locale)}/Mha`;

export const formatSignedArea = (locale: string, ha: number): string =>
  `${ha > 0 ? '+' : ''}${formatArea(locale, ha)}`;

export const formatTemperature = (locale: string, celsius: number, digits = 2, signed = false) =>
  `${signed ? formatSigned(locale, celsius, digits) : fixMinus(new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(celsius))}${NBSP}°C`;
