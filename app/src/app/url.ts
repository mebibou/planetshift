import { GROUP_CHOICES } from './groups';
import {
  CHANGE_OF,
  GAS_CHOICES,
  LAYERS,
  type ChangeOf,
  type GasChoice,
  type GroupChoice,
  type Layer,
} from '../map/layers';

export const VIEWS = ['explore', 'methodology'] as const;
export type View = (typeof VIEWS)[number];

export const CHARTS = ['temperature', 'avoided', 'cause'] as const;
export type ChartTab = (typeof CHARTS)[number];
export const HORIZONS = ['2050', '2100'] as const;
export type Horizon = (typeof HORIZONS)[number];
/** The map card's two views of the same layer. */
export const MAP_VIEWS = ['map', 'table'] as const;
export type MapView = (typeof MAP_VIEWS)[number];

export interface UiState {
  view: View;
  layer: Layer;
  changeOf: ChangeOf;
  group: GroupChoice;
  gas: GasChoice;
  chart: ChartTab;
  horizon: Horizon;
  mapView: MapView;
}

export const DEFAULT_UI: UiState = {
  view: 'explore',
  layer: 'change',
  changeOf: 'emissions',
  group: 'all',
  gas: 'co2e',
  chart: 'temperature',
  horizon: '2050',
  mapView: 'map',
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
    if (v !== null) p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
