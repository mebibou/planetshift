import type { Topology } from 'topojson-specification';
import type { AppState } from '../app/context';
import { h } from '../app/dom';
import { chartCsv, mapCsv, scenarioJson } from '../app/download';
import { downloadButton, downloadPanel } from '../app/downloadPanel';
import { GROUP_CHOICES } from '../app/groups';
import { icon } from '../app/icons';
import { MAP_VIEWS, type MapView, type UiState } from '../app/url';
import type { Climate, Country, Intensities, Meta } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatPercent } from '../i18n/format';
import type { ScenarioResult } from '../model/api';
import { segmented } from '../controls/segmented';
import { choropleth } from './choropleth';
import { LAYER_COLOURS, scaleKind } from './colours';
import { CHANGE_OF, GAS_CHOICES, LAYERS, layerValues, measureOf, type LayerSpec } from './layers';
import { legendBins } from './legend';
import { colourScale, pickColours, thresholdsFor } from './scales';
import { formatMeasure, tooltipModel } from './tooltip';
import { TIERS, worstSource } from './sources';
import { tableRows } from './table';
import { tableView } from './tableView';
import { tabKeys } from '../app/tabs';

export interface MapCardContext {
  t: T;
  locale: string;
  lang: 'en' | 'fr';
  world: Topology;
  countries: Country[];
  intensities: Intensities;
  climate: Climate;
  meta: Meta;
  currentYear: number;
  /** The folder the data was read from, and its files with their sizes. */
  folder: string;
  files: { name: string; bytes: number }[];
  ui: UiState;
  setUi: (change: (u: UiState) => UiState) => void;
}

export interface MapCard {
  el: HTMLElement;
  update: (result: ScenarioResult | null, state: AppState) => void;
}

const valueFormatter = (spec: LayerSpec, t: T, locale: string) => (v: number) =>
  spec.layer === 'change'
    ? formatPercent(locale, v, Math.abs(v) < 0.1 ? 1 : 0, true)
    : spec.layer === 'quality'
      ? t(`tiers.${Math.round(v)}`)
      : formatMeasure(locale, measureOf(spec))(v);

export const mapCard = (ctx: MapCardContext): MapCard => {
  const { t, locale, lang, world, countries, intensities, setUi } = ctx;
  const names = new Map(countries.map((c) => [c.iso3, c.name[lang] || c.name.en]));
  const allNames = new Map(countries.map((c) => [c.iso3, [c.name.en, c.name.fr, c.iso3]]));
  const englishNames = new Map(countries.map((c) => [c.iso3, c.name.en]));
  const map = choropleth(world, t('map.label'));
  const layer = segmented({
    name: 'layer',
    legend: t('map.layer'),
    options: LAYERS.map((v) => ({ value: v, label: t(`map.layers.${v}`) })),
    value: ctx.ui.layer,
    onChange: (layer) => setUi((u) => ({ ...u, layer })),
  });
  const changeOf = segmented({
    name: 'changeOf',
    legend: t('map.changeOf'),
    options: CHANGE_OF.map((v) => ({ value: v, label: t(`map.layers.${v}`) })),
    value: ctx.ui.changeOf,
    onChange: (changeOf) => setUi((u) => ({ ...u, changeOf })),
  });
  const gas = segmented({
    name: 'gas',
    legend: t('map.gas'),
    options: GAS_CHOICES.map((v) => ({ value: v, label: t(`gases.${v}`) })),
    value: ctx.ui.gas,
    onChange: (gas) => setUi((u) => ({ ...u, gas })),
  });
  const groupSelect = h(
    'select',
    {
      id: 'map-group',
      onchange: (e: Event) =>
        setUi((u) => ({ ...u, group: (e.target as HTMLSelectElement).value as UiState['group'] })),
    },
    ...GROUP_CHOICES.map((g) => h('option', { value: g }, t(`groups.${g}`))),
  );
  const group = h(
    'div',
    { class: 'field', 'data-control': 'group' },
    h('label', { for: 'map-group' }, t('map.group')),
    groupSelect,
  );
  const legendTitle = h('p', { class: 'legend-title' });
  const legend = h('ul', { class: 'legend' });
  const note = h('p', { class: 'map-note' });
  const table = tableView(t, locale);
  const viewTabs = MAP_VIEWS.map((v) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `map-tab-${v}`,
        class: 'view-tab',
        'data-view': v,
        'aria-controls': `map-panel-${v}`,
        onclick: () => setUi((u) => ({ ...u, mapView: v })),
        onkeydown: tabKeys(
          MAP_VIEWS,
          v,
          (target) => setUi((u) => ({ ...u, mapView: target })),
          (target) => `map-tab-${target}`,
        ),
      },
      icon(v),
      h('span', {}, t(`map.views.${v}`)),
    ),
  );
  const viewSwitch = h(
    'div',
    { class: 'view-tabs', role: 'tablist', 'aria-label': t('map.views.label') },
    ...viewTabs,
  );
  let last: { result: ScenarioResult | null; state: AppState } | null = null;
  const rowsOf = (result: ScenarioResult | null, state: AppState, nameOf: Map<string, string>) =>
    tableRows(
      result?.countries ?? [],
      state.ui,
      (iso3) => ({ name: nameOf.get(iso3) ?? iso3, names: allNames.get(iso3) ?? [iso3] }),
      (c) => worstSource(intensities, c.iso3, state.options.scope),
    );
  const downloads = downloadPanel({
    t,
    locale,
    meta: ctx.meta,
    folder: ctx.folder,
    files: ctx.files,
    sources: {
      map: () =>
        last?.result
          ? mapCsv(
              rowsOf(last.result, last.state, englishNames),
              last.state.ui,
              last.state.scenario,
            )
          : null,
      chart: (tab) =>
        last
          ? chartCsv({
              tab,
              result: last.result,
              climate: ctx.climate,
              scenario: last.state.scenario,
              options: last.state.options,
              currentYear: ctx.currentYear,
            })
          : null,
      scenario: () =>
        last
          ? scenarioJson({
              url: location.href,
              query: location.search,
              scenario: last.state.scenario,
              options: last.state.options,
              ui: last.state.ui,
              result: last.result,
              meta: ctx.meta,
            })
          : null,
    },
  });
  downloads.el.hidden = true;
  const downloadToggle = downloadButton(
    t('download.button'),
    () => {
      const open = downloads.el.hidden;
      downloads.el.hidden = !open;
      downloadToggle.setAttribute('aria-expanded', String(open));
      if (open) downloads.refresh();
    },
    'download-toggle',
  );
  downloadToggle.setAttribute('aria-expanded', 'false');
  downloadToggle.setAttribute('aria-controls', 'map-downloads');
  const mapPanel = h(
    'div',
    { role: 'tabpanel', id: 'map-panel-map', 'aria-labelledby': 'map-tab-map' },
    map.el,
    h('div', { class: 'legend-row' }, legendTitle, legend),
  );
  const tablePanel = h(
    'div',
    { role: 'tabpanel', id: 'map-panel-table', 'aria-labelledby': 'map-tab-table' },
    table.el,
  );
  const showView = (view: MapView) => {
    viewTabs.forEach((tab, i) => {
      const selected = MAP_VIEWS[i] === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    mapPanel.hidden = view !== 'map';
    tablePanel.hidden = view !== 'table';
  };
  const update = (result: ScenarioResult | null, state: AppState) => {
    const { ui } = state;
    const scope = state.options.scope;
    last = { result, state };
    showView(ui.mapView);
    layer.set(ui.layer);
    changeOf.set(ui.changeOf);
    gas.set(ui.gas);
    groupSelect.value = ui.group;
    const measure = measureOf(ui);
    changeOf.el.hidden = ui.layer !== 'change';
    gas.el.hidden = measure !== 'emissions';
    group.hidden = measure !== 'production';
    const spec: LayerSpec = ui;
    const byIso = new Map((result?.countries ?? []).map((c) => [c.iso3, c]));
    const values = layerValues(result?.countries ?? [], spec);
    const kind = scaleKind(ui.layer);
    const numbers = [...values.values()].filter((v): v is number => v !== null);
    const thresholds = thresholdsFor(kind, numbers, 7);
    const colours =
      kind === 'sequential'
        ? pickColours(LAYER_COLOURS[ui.layer], thresholds.length + 1)
        : LAYER_COLOURS[ui.layer];
    const scale = colourScale(thresholds, colours);
    const format = valueFormatter(spec, t, locale);
    map.paint({
      fillOf: (iso3) => {
        const v = values.get(iso3);
        return v === null || v === undefined ? null : scale(v);
      },
      tooltipOf: (iso3) =>
        tooltipModel(
          names.get(iso3) ?? iso3,
          byIso.get(iso3),
          spec,
          t,
          locale,
          worstSource(intensities, iso3, scope),
        ),
    });
    const what =
      measure === 'production'
        ? t('map.legend.production', { group: t(`groups.${ui.group}`) })
        : measure === 'emissions'
          ? t('map.legend.emissions', { gas: t(`gases.${ui.gas}`) })
          : measure === 'deforestation'
            ? t('map.legend.deforestation')
            : t('map.legend.land');
    legendTitle.textContent =
      ui.layer === 'change'
        ? t('map.legend.change', { what })
        : ui.layer === 'quality'
          ? t('map.legend.quality')
          : what;
    const bins =
      kind === 'quality'
        ? TIERS.map((tier, i) => ({ colour: colours[i] ?? '', label: t(`tiers.${tier}`) }))
        : legendBins(thresholds, colours, format);
    legend.replaceChildren(
      ...bins.map((b) =>
        h('li', {}, h('span', { class: 'swatch', style: `background: ${b.colour}` }), b.label),
      ),
      h(
        'li',
        {},
        h('span', { class: 'swatch nodata' }),
        t(ui.layer === 'deforestation' ? 'map.noClearing' : 'map.noData'),
      ),
    );
    note.textContent = t(`map.notes.${ui.layer}`);
    if (ui.mapView === 'table')
      table.update(rowsOf(result, state, names), ui, legendTitle.textContent);
  };
  return {
    el: h(
      'section',
      { class: 'card map-card', 'aria-labelledby': 'map-title' },
      h('h2', { id: 'map-title', class: 'visually-hidden' }, t('map.title')),
      h(
        'div',
        { class: 'map-head' },
        h('div', { class: 'card-tools' }, viewSwitch, downloadToggle),
        h('div', { class: 'map-controls' }, layer.el, changeOf.el, gas.el, group),
      ),
      downloads.el,
      mapPanel,
      tablePanel,
      note,
    ),
    update,
  };
};
