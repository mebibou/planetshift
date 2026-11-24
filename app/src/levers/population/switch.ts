import type { Options, Scenario } from '../../model/api';

/**
 * The prototypes of a population control, each behind ?popctl=: `people`, the number of people
 * on Earth in 2050 (a thought experiment), or `lever`, education and voluntary family planning.
 * Off by default, when nothing changes.
 */
export const POPCTL_KEY = 'popctl';
export const POPULATION_CONTROLS = ['people', 'lever'] as const;
export type PopulationControl = (typeof POPULATION_CONTROLS)[number];

export const populationControl = (query: string): PopulationControl | null => {
  const raw = new URLSearchParams(query.replace(/^\?/, '')).get(POPCTL_KEY);
  return POPULATION_CONTROLS.find((c) => c === raw) ?? null;
};

/** The control the page was opened with (none outside a browser). */
export const pageControl = (): PopulationControl | null =>
  populationControl(globalThis.location?.search ?? '');

/** The state read from a URL, without what a control left off by the switch would set. */
export const gatePopulation = (
  state: { scenario: Scenario; options: Options },
  control: PopulationControl | null,
): { scenario: Scenario; options: Options } => {
  const { people, ...options } = state.options;
  return {
    scenario: state.scenario,
    options: control === 'people' && people !== undefined ? { ...options, people } : options,
  };
};
