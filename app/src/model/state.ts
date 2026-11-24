import { ANIMAL_GROUPS, type AnimalGroup } from '../data/types';
import { LEVERS } from '../levers/registry';
import type { Levers, Options, Scenario } from './api';
import { DEFAULT_OPTIONS, OPTIONS } from './options';
import { BASE_SCENARIO } from './scenarios';

/** Short query keys for the per-group shares. */
const GROUP_KEYS: Record<AnimalGroup, string> = {
  ruminantMeat: 'rum',
  pigMeat: 'pig',
  poultryMeat: 'pou',
  dairy: 'dai',
  eggs: 'egg',
  seafood: 'sea',
};

const SCENARIO_CHOICES = {
  basis: ['protein', 'kcal'],
  replacement: ['current', 'legumes', 'plantMilk'],
  where: ['world', 'highIncome'],
} as const;

const SCENARIO_KEYS = {
  basis: 'basis',
  replacement: 'with',
  where: 'where',
} as const;

export const MIN_RAMP_END = 2025;
export const MAX_RAMP_END = 2050;

/** A share 0..1 as a percentage with at most one decimal. */
const percent = (share: number): string => String(Math.round(share * 1000) / 10);

const readPercent = (raw: string | null): number | undefined => {
  const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n / 100 : undefined;
};

/** The people-on-Earth number's key, in billions with two decimals. */
const PEOPLE_KEY = 'ppl';
const MAX_PEOPLE = 100;

const readPeople = (raw: string | null): number | undefined => {
  const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= MAX_PEOPLE ? Math.round(n * 100) / 100 : undefined;
};

const optionValue = (options: Options, field: string): string =>
  (options as unknown as Record<string, string>)[field] ?? '';

const pick = <T extends string>(raw: string | null, values: readonly T[], fallback: T): T =>
  values.find((v) => v === raw) ?? fallback;

/** Scenario and options → query string (no leading '?'), defaults left out. */
export const encodeState = (scenario: Scenario, options: Options): string => {
  const entries: [string, string][] = [
    ...(scenario.shift !== BASE_SCENARIO.shift
      ? [['shift', percent(scenario.shift)] as [string, string]]
      : []),
    ...ANIMAL_GROUPS.flatMap((g): [string, string][] => {
      const share = scenario.groupShifts[g];
      return share === undefined ? [] : [[GROUP_KEYS[g], percent(share)]];
    }),
    ...(Object.keys(SCENARIO_KEYS) as (keyof typeof SCENARIO_KEYS)[]).flatMap(
      (field): [string, string][] =>
        scenario[field] !== BASE_SCENARIO[field] ? [[SCENARIO_KEYS[field], scenario[field]]] : [],
    ),
    ...(scenario.rampEnd !== BASE_SCENARIO.rampEnd
      ? [['ramp', String(scenario.rampEnd)] as [string, string]]
      : []),
    ...LEVERS.flatMap(({ id, key }): [string, string][] => {
      const share = scenario.levers[id] ?? 0;
      return share > 0 ? [[key, percent(share)]] : [];
    }),
    ...OPTIONS.flatMap(({ field, key }): [string, string][] => {
      const value = optionValue(options, field);
      return value !== optionValue(DEFAULT_OPTIONS, field) ? [[key, value]] : [];
    }),
    ...(options.people === undefined
      ? []
      : [[PEOPLE_KEY, String(Math.round(options.people * 100) / 100)] as [string, string]]),
  ];
  return new URLSearchParams(entries).toString();
};

const earliestRampEnd = (currentYear: number): number => Math.min(currentYear + 1, MAX_RAMP_END);

/** The ramp's last year from the URL, its default when invalid, never before the slider's first. */
const rampOf = (ramp: number, currentYear: number | undefined): number =>
  Math.max(
    Number.isInteger(ramp) && ramp >= MIN_RAMP_END && ramp <= MAX_RAMP_END
      ? ramp
      : BASE_SCENARIO.rampEnd,
    currentYear === undefined ? MIN_RAMP_END : earliestRampEnd(currentYear),
  );

/**
 * Query string (with or without '?') → scenario and options; anything invalid takes its default.
 * Given the current year, a ramp that would end before the slider's first year starts there.
 */
export const decodeState = (
  query: string,
  currentYear?: number,
): { scenario: Scenario; options: Options } => {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const get = (key: string) => params.get(key);
  const ramp = Number(get('ramp'));
  const scenario: Scenario = {
    shift: readPercent(get('shift')) ?? BASE_SCENARIO.shift,
    groupShifts: Object.fromEntries(
      ANIMAL_GROUPS.flatMap((g) => {
        const share = readPercent(get(GROUP_KEYS[g]));
        return share === undefined ? [] : [[g, share]];
      }),
    ),
    basis: pick(get(SCENARIO_KEYS.basis), SCENARIO_CHOICES.basis, BASE_SCENARIO.basis),
    replacement: pick(
      get(SCENARIO_KEYS.replacement),
      SCENARIO_CHOICES.replacement,
      BASE_SCENARIO.replacement,
    ),
    rampEnd: rampOf(ramp, currentYear),
    where: pick(get(SCENARIO_KEYS.where), SCENARIO_CHOICES.where, BASE_SCENARIO.where),
    levers: Object.fromEntries(
      LEVERS.flatMap(({ id, key }) => {
        const share = readPercent(get(key));
        return share === undefined || share === 0 ? [] : [[id, share]];
      }),
    ) as Levers,
  };
  const options = Object.fromEntries(
    OPTIONS.map(({ field, key, values }) => [
      field,
      pick(get(key), values, optionValue(DEFAULT_OPTIONS, field)),
    ]),
  ) as unknown as Options;
  const people = readPeople(get(PEOPLE_KEY));
  return { scenario, options: people === undefined ? options : { ...options, people } };
};
