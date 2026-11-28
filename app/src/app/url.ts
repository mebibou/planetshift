import { GROUP_CHOICES } from './groups';
import { CAUSE_GASES, type CauseGas } from '../chart/series';
import {
  CHANGE_OF,
  FIRES_OF,
  GAS_CHOICES,
  LAYERS,
  SPECIES_PER,
  WASTE_OF,
  type ChangeOf,
  type FiresOf,
  type GasChoice,
  type GroupChoice,
  type Layer,
  type SpeciesPer,
  type WasteOf,
} from '../map/layers';

export const VIEWS = ['explore', 'methodology', 'deeptime'] as const;
export type View = (typeof VIEWS)[number];
/** The views the header lists by default; the deep-time prototype only once opened by its URL. */
export const NAV_VIEWS: readonly View[] = ['explore', 'methodology'];

export const CHARTS = ['temperature', 'cause', 'avoided', 'sealevel', 'ocean', 'waste'] as const;
export type ChartTab = (typeof CHARTS)[number];
export const HORIZONS = ['2050', '2100'] as const;
export type Horizon = (typeof HORIZONS)[number];
/** The map card's two views of the same layer. */
export const MAP_VIEWS = ['map', 'table'] as const;
export type MapView = (typeof MAP_VIEWS)[number];
/** The temperature and causes charts' first year: 1850 or 2000. */
export const RANGES = ['full', 'recent'] as const;
export type Range = (typeof RANGES)[number];
/** The Waste chart's views: food lost and wasted by stage, municipal waste by type or treatment. */
export const WASTE_VIEWS = ['food', 'types', 'treatment'] as const;
export type WasteView = (typeof WASTE_VIEWS)[number];
/** The Warming avoided chart's views: the total, or stacked by the food each lever shifts. */
export const AVOIDED_VIEWS = ['total', 'food'] as const;
export type AvoidedView = (typeof AVOIDED_VIEWS)[number];

export interface UiState {
  view: View;
  layer: Layer;
  changeOf: ChangeOf;
  group: GroupChoice;
  gas: GasChoice;
  chart: ChartTab;
  horizon: Horizon;
  mapView: MapView;
  range: Range;
  causeGas: CauseGas;
  speciesPer: SpeciesPer;
  wasteOf: WasteOf;
  wasteView: WasteView;
  avoidedView: AvoidedView;
  firesOf: FiresOf;
}

export const DEFAULT_UI: UiState = {
  view: 'explore',
  layer: 'emissions',
  changeOf: 'emissions',
  group: 'all',
  gas: 'co2e',
  chart: 'temperature',
  horizon: '2050',
  mapView: 'map',
  range: 'full',
  causeGas: 'all',
  speciesPer: 'country',
  wasteOf: 'food',
  wasteView: 'food',
  avoidedView: 'total',
  firesOf: 'burned',
};

/** Query parameters the interface owns; everything else belongs to the model's state. */
const UI_KEYS = {
  view: 'view',
  layer: 'layer',
  changeOf: 'change',
  group: 'group',
  gas: 'gas',
  chart: 'chart',
  horizon: 'to',
  mapView: 'mapview',
  range: 'range',
  causeGas: 'causegas',
  speciesPer: 'per',
  wasteOf: 'waste',
  wasteView: 'wasteview',
  avoidedView: 'avoidedview',
  firesOf: 'fire',
};
const KEPT_KEYS = ['data'];
const OWN_KEYS = [...Object.values(UI_KEYS), ...KEPT_KEYS];

const oneOf = <V extends string>(values: readonly V[], value: string | null, fallback: V): V =>
  values.find((v) => v === value) ?? fallback;

/** The view `?view=link` opened before The link was folded into Explore's charts. */
const OLD_LINK_VIEW = 'link';

export const parseUi = (query: string): UiState => {
  const p = new URLSearchParams(query);
  const oldLink = p.get(UI_KEYS.view) === OLD_LINK_VIEW;
  return {
    view: oneOf(VIEWS, p.get(UI_KEYS.view), DEFAULT_UI.view),
    layer: oneOf(LAYERS, p.get(UI_KEYS.layer), DEFAULT_UI.layer),
    changeOf: oneOf(CHANGE_OF, p.get(UI_KEYS.changeOf), DEFAULT_UI.changeOf),
    group: oneOf(GROUP_CHOICES, p.get(UI_KEYS.group), DEFAULT_UI.group),
    gas: oneOf(GAS_CHOICES, p.get(UI_KEYS.gas), DEFAULT_UI.gas),
    chart: oldLink ? 'cause' : oneOf(CHARTS, p.get(UI_KEYS.chart), DEFAULT_UI.chart),
    horizon: oneOf(HORIZONS, p.get(UI_KEYS.horizon), DEFAULT_UI.horizon),
    mapView: oneOf(MAP_VIEWS, p.get(UI_KEYS.mapView), DEFAULT_UI.mapView),
    range: oneOf(RANGES, p.get(UI_KEYS.range), DEFAULT_UI.range),
    causeGas: oneOf(CAUSE_GASES, p.get(UI_KEYS.causeGas), DEFAULT_UI.causeGas),
    speciesPer: oneOf(SPECIES_PER, p.get(UI_KEYS.speciesPer), DEFAULT_UI.speciesPer),
    wasteOf: oneOf(WASTE_OF, p.get(UI_KEYS.wasteOf), DEFAULT_UI.wasteOf),
    wasteView: oneOf(WASTE_VIEWS, p.get(UI_KEYS.wasteView), DEFAULT_UI.wasteView),
    avoidedView: oneOf(AVOIDED_VIEWS, p.get(UI_KEYS.avoidedView), DEFAULT_UI.avoidedView),
    firesOf: oneOf(FIRES_OF, p.get(UI_KEYS.firesOf), DEFAULT_UI.firesOf),
  };
};

/** The part of the query the model's decodeState reads. */
export const modelQuery = (query: string): string => {
  const p = new URLSearchParams(query);
  OWN_KEYS.forEach((k) => p.delete(k));
  return p.toString();
};

/** Model state, then the interface's non-default choices, then kept parameters such as data=. */
export const buildQuery = (encodedModel: string, ui: UiState, current: string): string => {
  const p = new URLSearchParams(encodedModel.replace(/^\?/, ''));
  (Object.keys(UI_KEYS) as (keyof UiState)[])
    .filter((k) => ui[k] !== DEFAULT_UI[k])
    .forEach((k) => p.set(UI_KEYS[k], ui[k]));
  const kept = new URLSearchParams(current);
  KEPT_KEYS.forEach((k) => {
    const v = kept.get(k);
    if (v !== null) {
      p.set(k, v);
    }
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
