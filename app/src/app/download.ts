import { GASES, type BandSeries, type Climate, type Meta, type Series } from '../data/types';
import type { Options, Scenario, ScenarioResult } from '../model/api';
import { causesIn, type Attribution } from '../chart/series';
import { measureOf, type LayerSpec, type Measure } from '../map/layers';
import type { TableRow } from '../map/table';
import type { ChartTab, UiState } from './url';
import { formatSignificant } from '../i18n/format';

export type Cell = string | number | null | undefined;

/** Excel reads a UTF-8 file as such only when it starts with a byte order mark. */
export const BOM = '﻿';

/** Seven significant digits, without thousands separators or exponent when it is not needed. */
export const csvNumber = (v: number): string =>
  Number.isFinite(v) ? String(Number(v.toPrecision(7))) : '';

export const csvCell = (cell: Cell): string => {
  const text = typeof cell === 'number' ? csvNumber(cell) : (cell ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** RFC 4180: comma-separated, CRLF line ends, fields with a comma, quote or line break quoted. */
export const toCsv = (header: string[], rows: Cell[][]): string =>
  BOM + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

export interface DownloadFile {
  name: string;
  type: string;
  text: string;
}

const csvFile = (name: string, header: string[], rows: Cell[][]): DownloadFile => ({
  name,
  type: 'text/csv;charset=utf-8',
  text: toCsv(header, rows),
});

/** A short name for the scenario in a file name: shift share, ramp year, levers on. */
export const scenarioSlug = (scenario: Scenario): string => {
  const levers = Object.values(scenario.levers).filter((v) => (v ?? 0) > 0).length;
  const groups = Object.keys(scenario.groupShifts).length;
  return [
    `shift${Math.round(scenario.shift * 100)}`,
    String(scenario.rampEnd),
    groups ? `foods${groups}` : '',
    levers ? `levers${levers}` : '',
  ]
    .filter(Boolean)
    .join('-');
};

/** The layer and what it is of: `change-emissions-ch4`, `production-dairy`, `land`. */
export const layerSlug = (spec: LayerSpec): string => {
  const measure = measureOf(spec);
  const selection =
    spec.layer === 'quality'
      ? ''
      : measure === 'emissions'
        ? spec.gas
        : measure === 'production' && spec.group !== 'all'
          ? spec.group
          : '';
  return [spec.layer, spec.layer === 'change' ? spec.changeOf : '', selection]
    .filter(Boolean)
    .join('-');
};

export const unitOf = (measure: Measure, spec: LayerSpec): string =>
  measure === 'production'
    ? 't'
    : measure === 'land'
      ? 'ha'
      : measure === 'landShare'
        ? 'share of land area'
        : measure === 'deforestation'
          ? 'ha'
          : spec.gas === 'co2e'
            ? 'kg CO2e (GWP100)'
            : `kg ${spec.gas.toUpperCase()}`;

export const MAP_HEADER = [
  'iso3',
  'country',
  'layer',
  'measure',
  'selection',
  'unit',
  'before',
  'after',
  'change_relative',
  'tier',
  'source',
];

/** The map's file name for a layer and a scenario, in a format. */
export const mapFileName = (spec: LayerSpec, scenario: Scenario, ext: string): string =>
  `planetshift-map-${layerSlug(spec)}-${scenarioSlug(scenario)}.${ext}`;

/** The map's layer, every country: its values before and after the shift, unit, tier and source. */
export const mapCsv = (rows: TableRow[], spec: LayerSpec, scenario: Scenario): DownloadFile => {
  const measure = measureOf(spec);
  const selection = measure === 'emissions' ? spec.gas : measure === 'production' ? spec.group : '';
  return csvFile(
    mapFileName(spec, scenario, 'csv'),
    MAP_HEADER,
    rows.map((r) => [
      r.iso3,
      r.name,
      spec.layer,
      measure,
      selection,
      unitOf(measure, spec),
      r.before,
      r.after,
      r.change,
      r.tier,
      r.source,
    ]),
  );
};

const at = (years: number[], values: (number | null)[]) => {
  const index = new Map(years.map((y, i) => [y, values[i] ?? null]));
  return (year: number) => index.get(year) ?? null;
};

const bandColumns = (prefix: string, unit: string) =>
  ['median', 'p05', 'p95'].map((q) => `${prefix}_${q}_${unit}`);

const bandAt = (band: BandSeries) => {
  const [m, lo, hi] = [
    at(band.years, band.median),
    at(band.years, band.p05),
    at(band.years, band.p95),
  ];
  return (year: number) => [m(year), lo(year), hi(year)];
};

const seriesAt = (s: Series) => at(s.years, s.values);

/** Global temperature, 1850–2100: observed, without and with the levers (5–95%), natural factors. */
export const temperatureRows = (
  result: ScenarioResult,
  natural?: BandSeries,
): { header: string[]; rows: Cell[][] } => {
  const tp = result.temperature;
  const nat = natural ? bandAt(natural) : null;
  return {
    header: [
      'year',
      'observed_degC',
      ...bandColumns('without_levers', 'degC'),
      ...bandColumns('with_levers', 'degC'),
      ...(nat ? bandColumns('natural_only', 'degC') : []),
    ],
    rows: tp.years.map((year, i) => [
      year,
      tp.observed[i],
      tp.baseline.median[i],
      tp.baseline.p05[i],
      tp.baseline.p95[i],
      tp.scenario.median[i],
      tp.scenario.p05[i],
      tp.scenario.p95[i],
      ...(nat ? nat(year) : []),
    ]),
  };
};

/** Warming avoided each year from the current year to 2100, median and 5–95%. */
export const avoidedRows = (
  result: ScenarioResult,
  currentYear: number,
): { header: string[]; rows: Cell[][] } => {
  const tp = result.temperature;
  return {
    header: ['year', ...bandColumns('warming_avoided', 'degC')],
    rows: tp.years
      .map((year, i) => ({ year, i }))
      .filter(({ year }) => year >= currentYear)
      .map(({ year, i }) => [year, tp.avoided.median[i], tp.avoided.p05[i], tp.avoided.p95[i]]),
  };
};

/** The band columns of each cause of an attribution, named with `prefix`. */
const attributionColumns = (attribution: Attribution, prefix: string) => {
  const causes = causesIn(attribution);
  const values = causes.map((c) => bandAt(attribution[c] as BandSeries));
  return {
    header: causes.flatMap((c) => bandColumns(`warming_${prefix}${c}`, 'degC')),
    at: (year: number) => values.flatMap((v) => v(year)),
  };
};

/**
 * Warming by cause (5–95%) and observed temperature under the chosen SSP, then each greenhouse
 * gas's warming by cause when the build has it.
 */
export const causeRows = (
  climate: Climate,
  options: Pick<Options, 'ssp' | 'temperature'>,
): { header: string[]; rows: Cell[][] } => {
  const attribution = climate.attribution[options.ssp];
  const byGas = climate.attributionByGas?.[options.ssp];
  const causes = attributionColumns(attribution, '');
  const gases = byGas ? GASES.map((g) => attributionColumns(byGas[g], `${g}_`)) : [];
  const observed = seriesAt(climate.observed[options.temperature]);
  return {
    header: ['year', ...causes.header, 'observed_degC', ...gases.flatMap((g) => g.header)],
    rows: attribution.agriculture.years.map((year) => [
      year,
      ...causes.at(year),
      observed(year),
      ...gases.flatMap((g) => g.at(year)),
    ]),
  };
};

export interface ChartInput {
  tab: ChartTab;
  result: ScenarioResult | null;
  climate: Climate;
  scenario: Scenario;
  options: Options;
  currentYear: number;
}

/** The data of one chart tab as CSV, or null when the model has not run. */
export const chartCsv = (input: ChartInput): DownloadFile | null => {
  const { tab, result, climate, scenario, options, currentYear } = input;
  const table =
    tab === 'cause'
      ? causeRows(climate, options)
      : !result
        ? null
        : tab === 'avoided'
          ? avoidedRows(result, currentYear)
          : temperatureRows(result, climate.naturalOnly);
  return table
    ? csvFile(chartFileName(tab, scenario, options, 'csv'), table.header, table.rows)
    : null;
};

/** A chart tab's file name for its settings, in a format. */
export const chartFileName = (
  tab: ChartTab,
  scenario: Scenario,
  options: Options,
  ext: string,
): string => `planetshift-${tab}-${tab === 'cause' ? options.ssp : scenarioSlug(scenario)}.${ext}`;

export interface Licence {
  name: string;
  url: string;
}

export const LICENCES: Record<string, Licence> = {
  ccBy: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  ccBySa: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  ccByNcSa: {
    name: 'CC BY-NC-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  ccByIgo: { name: 'CC BY 3.0 IGO', url: 'https://creativecommons.org/licenses/by/3.0/igo/' },
  unTerms: { name: 'UN terms of use', url: 'https://www.un.org/en/about-us/terms-of-use' },
};

const pick = (...keys: (keyof typeof LICENCES)[]): Licence[] =>
  keys.map((k) => LICENCES[k]).filter((l): l is Licence => l !== undefined);

/** A data file's terms, as DATA-LICENCES.md gives them. */
export const fileLicences = (file: string): Licence[] => {
  const base = file.replace(/\.json$/, '');
  return base === 'climate' || base === 'sectors'
    ? pick('ccByNcSa')
    : base === 'industry'
      ? pick('ccBySa')
      : base === 'population'
        ? pick('ccByIgo', 'ccBy')
        : base === 'waste'
          ? pick('unTerms')
          : pick('ccBy');
};

/** What each download is derived from: the temperatures come from climate.json. */
export const DOWNLOAD_LICENCES = {
  map: pick('ccBy'),
  chart: pick('ccByNcSa'),
  scenario: pick('ccByNcSa'),
};

/** "Planetshift (2026), <address>. Data: <sources>." */
export const citation = (meta: Meta, url: string): string =>
  `Planetshift (${meta.builtAt.slice(0, 4)}), ${url}. Data: ${meta.sources.map((s) => s.name).join('; ')}.`;

export interface ScenarioInput {
  url: string;
  query: string;
  scenario: Scenario;
  options: Options;
  ui: UiState;
  result: ScenarioResult | null;
  meta: Meta;
}

/** The scenario's settings (the whole URL state), its summary, the licence and how to cite. */
export const scenarioJson = (input: ScenarioInput): DownloadFile => {
  const { url, query, scenario, options, ui, result, meta } = input;
  return {
    name: `planetshift-scenario-${scenarioSlug(scenario)}.json`,
    type: 'application/json',
    text: `${JSON.stringify(
      {
        app: 'Planetshift',
        url,
        query,
        dataBuilt: meta.builtAt,
        baseYear: meta.baseYear,
        scenario,
        options,
        view: ui,
        summary: result?.summary ?? null,
        licence: DOWNLOAD_LICENCES.scenario,
        citation: citation(meta, url),
        sources: meta.sources,
      },
      null,
      2,
    )}\n`,
  };
};

/** Saves a file through a temporary link with `download`. */
export const saveFile = (file: DownloadFile): void =>
  saveBlob(file.name, new Blob([file.text], { type: file.type }));

/** Saves `blob` as a file named `name`, from the browser's download. */
export const saveBlob = (name: string, blob: Blob): void => {
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
};

export const formatBytes = (locale: string, bytes: number): string =>
  bytes >= 1e6
    ? `${formatSignificant(locale, bytes / 1e6, 2)} MB`
    : `${formatSignificant(locale, Math.max(bytes / 1e3, 1), 2)} kB`;
