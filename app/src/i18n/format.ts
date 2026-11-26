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

const BILLION_M3: Record<string, string> = {
  en: `billion${NBSP}m³`,
  fr: `milliards${NBSP}de${NBSP}m³`,
};
const SMALL = 0.01;

/** A number in E notation, e.g. 3.2E-4. */
const formatExponent = (locale: string, value: number, digits: number): string => {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  return `${formatSignificant(locale, value / 10 ** exponent, digits)}E${exponent}`;
};

const formatBillions = (locale: string, value: number): string =>
  value !== 0 && Math.abs(value) < SMALL
    ? formatExponent(locale, value, 2)
    : formatSignificant(locale, value, 3);

/** Litres in billion m³ (km³), one unit for every water figure so sizes compare; `eq` adds "eq". */
/** Litres as a number of billion m³, without the unit. */
export const formatBillionM3 = (locale: string, litres: number): string =>
  formatBillions(locale, litres / 1e12);

export const formatVolume = (locale: string, litres: number, eq = false): string => {
  const name = BILLION_M3[locale.slice(0, 2)] ?? BILLION_M3.en;
  return `${formatBillions(locale, litres / 1e12)}${NBSP}${name}${eq ? `${NBSP}eq` : ''}`;
};

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
