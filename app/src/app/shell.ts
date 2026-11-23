import { attempt } from './attempt';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../model/api';
import { BASE_SCENARIO } from '../model/scenarios';
import { decodeState, encodeState } from '../model/state';
import type { AppState } from './context';
import { buildQuery, modelQuery } from './url';

/** The model's state from the URL, or the defaults when it has none or cannot read it. */
export const stateFromQuery = (
  query: string,
  currentYear?: number,
): { scenario: Scenario; options: Options } =>
  attempt(() => decodeState(modelQuery(query), currentYear), {
    scenario: BASE_SCENARIO,
    options: DEFAULT_OPTIONS,
  });

export const queryOf = (s: AppState, current: string): string =>
  buildQuery(
    attempt(() => encodeState(s.scenario, s.options), modelQuery(current)),
    s.ui,
    current,
  );
