import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Topology } from 'topojson-specification';
import type { AppState } from '../app/context';
import { chartCsv, mapCsv, mapFileName, scenarioJson } from '../app/download';
import { GROUP_CHOICES } from '../app/groups';
import { tabKeys } from '../app/tabs';
import { MAP_VIEWS, type UiState } from '../app/url';
import type { Climate, Country, Intensities, LandUse, Meta } from '../data/types';
import { formatPercent } from '../i18n/format';
import type { T } from '../i18n/i18n';
import { choropleth } from '../map/choropleth';
import { LAYER_COLOURS, scaleKind } from '../map/colours';
import {
  CHANGE_OF,
  GAS_CHOICES,
  LAYERS,
  landUseCo2,
  layerValues,
  measureOf,
  type LandUseCo2,
  type Layer,
  type LayerSpec,
  type Measure,
} from '../map/layers';
import { legendBins } from '../map/legend';
import { colourScale, LAND_SHARE_THRESHOLDS, pickColours, thresholdsFor } from '../map/scales';
import { TIERS, worstSource } from '../map/sources';
import { tableRows, type TableRow } from '../map/table';
import { formatMeasure, tooltipModel } from '../map/tooltip';
import type { ScenarioResult } from '../model/api';
import { DownloadButton, DownloadPanel, type DownloadSources } from './Download';
import { Icon } from './Icon';
import { Segmented } from './Segmented';
import { TableView } from './TableView';
import { useDrawn } from './useDrawn';

export interface MapCardProps {
  t: T;
  locale: string;
  lang: 'en' | 'fr';
  world: Topology;
  countries: Country[];
  intensities: Intensities;
  climate: Climate;
  meta: Meta;
  landUse?: LandUse | undefined;
  currentYear: number;
  /** The folder the data was read from, and its files with their sizes. */
  folder: string;
  files: { name: string; bytes: number }[];
  result: ScenarioResult | null;
  state: AppState;
  setUi: (change: (u: UiState) => UiState) => void;
}

const valueFormatter = (spec: LayerSpec, t: T, locale: string) => (v: number) =>
  spec.layer === 'change'
    ? formatPercent(locale, v, Math.abs(v) < 0.1 ? 1 : 0, true)
    : spec.layer === 'quality'
      ? t(`tiers.${Math.round(v)}`)
      : formatMeasure(locale, measureOf(spec))(v);

/** The layer's colour scale: its kind, thresholds and colours, from the values it shows. */
const paletteOf = (layer: Layer, values: ReadonlyMap<string, number | null>) => {
  const kind = scaleKind(layer);
  const numbers = [...values.values()].filter((v): v is number => v !== null);
  const thresholds = layer === 'land' ? LAND_SHARE_THRESHOLDS : thresholdsFor(kind, numbers, 7);
  const colours =
    kind === 'sequential'
      ? pickColours(LAYER_COLOURS[layer], thresholds.length + 1)
      : LAYER_COLOURS[layer];
  return { kind, thresholds, colours, scale: colourScale(thresholds, colours) };
};
type Palette = ReturnType<typeof paletteOf>;

/** What each measure shows, for the legend's title. */
const MEASURE_TITLES: Record<Measure, (t: T, ui: UiState, years: readonly number[]) => string> = {
  production: (t, ui) => t('map.legend.production', { group: t(`groups.${ui.group}`) }),
  emissions: (t, ui) => t('map.legend.emissions', { gas: t(`gases.${ui.gas}`) }),
  deforestation: (t) => t('map.legend.deforestation'),
  landShare: (t) => t('map.legend.landShare'),
  land: (t) => t('map.legend.land'),
  landCo2: (t, _, [from, to]) => t('map.legend.landCo2', { from: from ?? '', to: to ?? '' }),
};

const legendTitleOf = (t: T, ui: UiState, years: readonly number[]): string => {
  const what = MEASURE_TITLES[measureOf(ui)](t, ui, years);
  return ui.layer === 'change'
    ? t('map.legend.change', { what })
    : ui.layer === 'quality'
      ? t('map.legend.quality')
      : what;
};

/** The legend's entries: one per bin, then no data. */
const Legend = ({
  t,
  locale,
  ui,
  palette,
}: {
  t: T;
  locale: string;
  ui: UiState;
  palette: Palette;
}) => {
  const bins =
    palette.kind === 'quality'
      ? TIERS.map((tier, i) => ({ colour: palette.colours[i] ?? '', label: t(`tiers.${tier}`) }))
      : legendBins(palette.thresholds, palette.colours, valueFormatter(ui, t, locale));
  return (
    <ul className="legend">
      {bins.map((b) => (
        <li key={b.label}>
          <span className="swatch" style={{ background: b.colour }} />
          {b.label}
        </li>
      ))}
      <li>
        <span className="swatch nodata" />
        {t(ui.layer === 'deforestation' ? 'map.noClearing' : 'map.noData')}
      </li>
    </ul>
  );
};

/** Each country's row of the table, its name in `nameOf`'s language. */
const useRows = (
  props: MapCardProps,
  landUse: LandUseCo2,
): ((nameOf: Map<string, string>) => TableRow[]) => {
  const { countries, intensities, result, state } = props;
  const allNames = useMemo(
    () => new Map(countries.map((c) => [c.iso3, [c.name.en, c.name.fr, c.iso3]])),
    [countries],
  );
  return (nameOf) =>
    tableRows(
      result?.countries ?? [],
      state.ui,
      (iso3) => ({ name: nameOf.get(iso3) ?? iso3, names: allNames.get(iso3) ?? [iso3] }),
      (c) => worstSource(intensities, c.iso3, state.options.scope),
      landUse,
    );
};

/** What the download panel saves: the layer, each chart, the scenario. */
const sourcesOf = (
  props: MapCardProps,
  rowsOf: (nameOf: Map<string, string>) => TableRow[],
  englishNames: Map<string, string>,
): DownloadSources => {
  const { result, state, climate, currentYear, meta } = props;
  return {
    map: () => (result ? mapCsv(rowsOf(englishNames), state.ui, state.scenario) : null),
    chart: (tab) =>
      chartCsv({
        tab,
        result,
        climate,
        scenario: state.scenario,
        options: state.options,
        currentYear,
      }),
    scenario: () =>
      scenarioJson({
        url: location.href,
        query: location.search,
        scenario: state.scenario,
        options: state.options,
        ui: state.ui,
        result,
        meta,
      }),
  };
};

/** Paints the map from the result and the layer chosen, each time either changes. */
const usePaint = (props: MapCardProps, names: Map<string, string>, landUse: LandUseCo2) => {
  const { t, locale, world, intensities, result, state } = props;
  const [map, mapRef] = useDrawn(() => choropleth(world, t('map.label')));
  const { ui } = state;
  const scope = state.options.scope;
  const values = useMemo(
    () => layerValues(result?.countries ?? [], ui, landUse),
    [result, ui, landUse],
  );
  const palette = useMemo(() => paletteOf(ui.layer, values), [ui.layer, values]);
  useEffect(() => {
    const byIso = new Map((result?.countries ?? []).map((c) => [c.iso3, c]));
    map.paint({
      fillOf: (iso3) => {
        const v = values.get(iso3);
        return v === null || v === undefined ? null : palette.scale(v);
      },
      tooltipOf: (iso3) =>
        tooltipModel(
          names.get(iso3) ?? iso3,
          byIso.get(iso3),
          ui,
          t,
          locale,
          worstSource(intensities, iso3, scope),
          landUse,
        ),
    });
  }, [map, result, ui, values, palette, names, t, locale, intensities, scope, landUse]);
  return { mapRef, palette };
};

const ViewTabs = ({ t, ui, setUi }: Pick<MapCardProps, 't' | 'setUi'> & { ui: UiState }) => {
  const select = (v: UiState['mapView']) => setUi((u) => ({ ...u, mapView: v }));
  return (
    <div className="view-tabs" role="tablist" aria-label={t('map.views.label')}>
      {MAP_VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          id={`map-tab-${v}`}
          className="view-tab"
          data-view={v}
          aria-controls={`map-panel-${v}`}
          aria-selected={ui.mapView === v}
          tabIndex={ui.mapView === v ? 0 : -1}
          onClick={() => select(v)}
          onKeyDown={(e: KeyboardEvent) =>
            tabKeys(MAP_VIEWS, v, select, (target) => `map-tab-${target}`)(e.nativeEvent)
          }
        >
          <Icon name={v} />
          <span>{t(`map.views.${v}`)}</span>
        </button>
      ))}
    </div>
  );
};

/** The map's choices: the layer, what changes, the gas and the food group. */
const MapControls = ({ t, ui, setUi }: Pick<MapCardProps, 't' | 'setUi'> & { ui: UiState }) => {
  const measure = measureOf(ui);
  return (
    <div className="map-controls">
      <Segmented<Layer>
        name="layer"
        legend={t('map.layer')}
        options={LAYERS.map((v) => ({
          value: v,
          label: t(v === 'land' ? 'map.landUse' : `map.layers.${v}`),
        }))}
        value={ui.layer}
        onChange={(layer) => setUi((u) => ({ ...u, layer }))}
      />
      <Segmented<UiState['changeOf']>
        name="changeOf"
        legend={t('map.changeOf')}
        options={CHANGE_OF.map((v) => ({ value: v, label: t(`map.layers.${v}`) }))}
        value={ui.changeOf}
        hidden={ui.layer !== 'change'}
        onChange={(changeOf) => setUi((u) => ({ ...u, changeOf }))}
      />
      <Segmented<UiState['gas']>
        name="gas"
        legend={t('map.gas')}
        options={GAS_CHOICES.map((v) => ({ value: v, label: t(`gases.${v}`) }))}
        value={ui.gas}
        hidden={measure !== 'emissions'}
        onChange={(gas) => setUi((u) => ({ ...u, gas }))}
      />
      <div className="field" data-control="group" hidden={measure !== 'production'}>
        <label htmlFor="map-group">{t('map.group')}</label>
        <select
          id="map-group"
          value={ui.group}
          onChange={(e) => setUi((u) => ({ ...u, group: e.target.value as UiState['group'] }))}
        >
          {GROUP_CHOICES.map((g) => (
            <option key={g} value={g}>
              {t(`groups.${g}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/** The map card: a choropleth or a table of every country, its choices and its downloads. */
export const MapCard = (props: MapCardProps) => {
  const { t, locale, lang, countries, state, setUi } = props;
  const { ui } = state;
  const names = useMemo(
    () => new Map(countries.map((c) => [c.iso3, c.name[lang] || c.name.en])),
    [countries, lang],
  );
  const englishNames = useMemo(
    () => new Map(countries.map((c) => [c.iso3, c.name.en])),
    [countries],
  );
  const [downloading, setDownloading] = useState(false);
  const card = useRef<HTMLElement>(null);
  const landUse = useMemo(() => landUseCo2(props.landUse), [props.landUse]);
  const rowsOf = useRows(props, landUse);
  const { mapRef, palette } = usePaint(props, names, landUse);
  const legendTitle = legendTitleOf(t, ui, props.landUse?.years ?? []);
  return (
    <section ref={card} className="card map-card" aria-labelledby="map-title">
      <h2 id="map-title" className="visually-hidden">
        {t('map.title')}
      </h2>
      <div className="map-head">
        <div className="card-tools">
          <ViewTabs t={t} ui={ui} setUi={setUi} />
          <DownloadButton
            label={t('download.button')}
            className="download-toggle"
            aria-expanded={downloading}
            aria-controls="map-downloads"
            onClick={() => setDownloading(!downloading)}
          />
        </div>
        <MapControls t={t} ui={ui} setUi={setUi} />
      </div>
      <DownloadPanel
        t={t}
        locale={locale}
        meta={props.meta}
        folder={props.folder}
        files={props.files}
        sources={sourcesOf(props, rowsOf, englishNames)}
        mapImage={{
          name: (format) => mapFileName(ui, state.scenario, format),
          card: () => card.current,
          title: legendTitle,
        }}
        hidden={!downloading}
      />
      <div
        role="tabpanel"
        id="map-panel-map"
        aria-labelledby="map-tab-map"
        hidden={ui.mapView !== 'map'}
      >
        <div className="drawn" ref={mapRef} />
        <div className="legend-row">
          <p className="legend-title">{legendTitle}</p>
          <Legend t={t} locale={locale} ui={ui} palette={palette} />
        </div>
      </div>
      <div
        role="tabpanel"
        id="map-panel-table"
        aria-labelledby="map-tab-table"
        hidden={ui.mapView !== 'table'}
      >
        <TableView
          key={ui.layer}
          t={t}
          locale={locale}
          rows={rowsOf(names)}
          spec={ui}
          caption={legendTitle}
        />
      </div>
      <p className="map-note">{t(`map.notes.${ui.layer}`)}</p>
    </section>
  );
};
