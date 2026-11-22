import type { Topology } from 'topojson-specification';
import type { ModelData } from '../data/types';
import type { Lang, T } from '../i18n/i18n';
import type { Options, Scenario } from '../model/api';
import type { Theme } from './theme';
import type { UiState } from './url';

export interface AppState {
  scenario: Scenario;
  options: Options;
  ui: UiState;
  lang: Lang;
  theme: Theme;
}

/** What every view is built with: the data, the language, and the ways to change the state. */
export interface ViewContext {
  t: T;
  lang: Lang;
  locale: string;
  data: ModelData;
  /** The data as loaded so far, a deferred lever file included once it has arrived. */
  latestData: () => ModelData;
  /** Loads every deferred lever file, for what each lever is worth; the view runs again then. */
  loadAll: () => void;
  world: Topology;
  currentYear: number;
  state: AppState;
  setScenario: (change: (s: Scenario) => Scenario) => void;
  setOptions: (change: (o: Options) => Options) => void;
  setUi: (change: (u: UiState) => UiState) => void;
}
