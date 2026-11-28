import type { SeaLevelBand } from '../model/seaLevel';
import {
  GASES,
  type BandSeries,
  type Climate,
  type Meta,
  type ModelData,
  type Series,
} from '../data/types';
import { oceanPlasticTotal, wasteBars } from '../chart/wasteBars';
import { populationPath } from '../chart/populationArea';
import type { Options, Scenario, ScenarioResult } from '../model/api';
import { attributionFor, causeGasesOf, causesIn, type Attribution } from '../chart/series';
import { measureOf, type Layer, type LayerSpec, type Measure } from '../map/layers';
import type { TableRow } from '../map/table';
import { WASTE_VIEWS, type ChartTab, type UiState } from './url';
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

/** The layers whose CSV names the choice they show: the waste, or what of the fires. */
const CHOICES: Partial<Record<Layer, (spec: LayerSpec) => string>> = {
  waste: (spec) => spec.wasteOf ?? 'food',
  fires: (spec) => spec.firesOf ?? 'burned',
};

/** What a layer of a measure is of: the gas, the food group, the waste or the fires; '' for none. */
const selectionOf = (spec: LayerSpec, measure: Measure): string =>
  measure === 'emissions'
    ? spec.gas
    : measure === 'production'
      ? spec.group
      : (CHOICES[spec.layer]?.(spec) ?? '');

/** The layer and what it is of: `change-emissions-ch4`, `production-dairy`, `land`. */
export const layerSlug = (spec: LayerSpec): string => {
  const selection = spec.layer === 'quality' ? '' : selectionOf(spec, measureOf(spec));
  return [spec.layer, spec.layer === 'change' ? spec.changeOf : '', selection]
    .filter((part) => part && part !== 'all')
    .join('-');
};

const UNITS: Record<Measure, (spec: LayerSpec) => string> = {
  production: () => 't',
  land: () => 'ha',
  landShare: () => 'share of land area',
  deforestation: () => 'ha',
  landCo2: () => 'kg CO2',
  mammals: () => 't live weight per km2',
  species: () => 'species committed to extinction',
  speciesDensity: () => 'species committed to extinction per Mha of farmland',
  water: () => 'L of freshwater withdrawn',
  waterScarcity: () => 'L eq of scarcity-weighted water use (AWARE 2.0), crops HESTIA covers only',
  emissions: (spec) => (spec.gas === 'co2e' ? 'kg CO2e (GWP100)' : `kg ${spec.gas.toUpperCase()}`),
  foodWaste: () => 't of food lost before shops and wasted after them',
  municipalWaste: () => 't of municipal solid waste (no lever changes it)',
  oceanPlastic: () => 't of plastic reaching the ocean through rivers (no lever changes it)',
  fossilMethane: () => 'kg CH4 leaked by oil, gas and coal (CEDS 2022)',
  wasteMethane: () => 'kg CH4 of landfills and wastewater',
  fireAnomaly: () =>
    'share by which the area burned in the latest fire season is above the mean of the seasons before it, negative below (no lever changes it)',
  forestFireAnomaly: () =>
    'share by which the forest burned in the latest fire season is above the mean of the seasons before it, negative below (no lever changes it)',
  fireCarbon: () => 't C emitted by fires in the latest fire season (no lever changes it)',
  pollination: () => 'share of crop production (t) from pollinator-dependent crops',
};

export const unitOf = (measure: Measure, spec: LayerSpec): string => UNITS[measure](spec);

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
  'after_farm_before',
  'after_farm_after',
  'clearing_co2_before',
  'clearing_co2_after',
  'drained_soils_co2_before',
  'drained_soils_co2_after',
];

/** The map's file name for a layer and a scenario, in a format. */
export const mapFileName = (spec: LayerSpec, scenario: Scenario, ext: string): string =>
  `planetshift-map-${layerSlug(spec)}-${scenarioSlug(scenario)}.${ext}`;

/** The map's layer, every country: its values before and after the shift, unit, tier and source. */
export const mapCsv = (rows: TableRow[], spec: LayerSpec, scenario: Scenario): DownloadFile => {
  const measure = measureOf(spec);
  const selection = selectionOf(spec, measure);
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
      r.beyond.chainBefore,
      r.beyond.chainAfter,
      r.beyond.clearingBefore,
      r.beyond.clearingAfter,
      r.beyond.drainedBefore,
      r.beyond.drainedAfter,
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

/** The world population the temperature chart draws, by year, when the build has it. */
const populationAt = (result: ScenarioResult) => {
  const path = result.population ? populationPath(result.population) : null;
  return path
    ? at(
        path.map((q) => q.year),
        path.map((q) => q.value),
      )
    : null;
};

/**
 * Global temperature, 1850–2100: observed, without and with the levers (5–95%), natural factors,
 * and the world population.
 */
export const temperatureRows = (
  result: ScenarioResult,
  natural?: BandSeries,
  currentYear = -Infinity,
): { header: string[]; rows: Cell[][] } => {
  const tp = result.temperature;
  const nat = natural ? bandAt(natural) : null;
  const pop = populationAt(result);
  return {
    header: [
      'year',
      'observed_degC',
      ...bandColumns('without_levers', 'degC'),
      ...bandColumns('with_levers', 'degC'),
      ...(nat ? bandColumns('natural_only', 'degC') : []),
      ...(pop ? ['world_population_people'] : []),
    ],
    rows: tp.years.map((year, i) => [
      year,
      tp.observed[i],
      tp.baseline.median[i],
      tp.baseline.p05[i],
      tp.baseline.p95[i],
      ...(year < currentYear
        ? [null, null, null]
        : [tp.scenario.median[i], tp.scenario.p05[i], tp.scenario.p95[i]]),
      ...(nat ? nat(year) : []),
      ...(pop ? [pop(year)] : []),
    ]),
  };
};

/**
 * Warming avoided each year from the current year to 2100, median and 5–95%, then the median's
 * split by food of each family split by food, as `warming_avoided_<family>_<food>_degC`.
 */
export const avoidedRows = (
  result: ScenarioResult,
  currentYear: number,
): { header: string[]; rows: Cell[][] } => {
  const tp = result.temperature;
  const foods = Object.entries(tp.avoidedByFood).flatMap(([family, byFood]) =>
    Object.entries(byFood).map(([food, series]) => ({ name: `${family}_${food}`, series })),
  );
  return {
    header: [
      'year',
      ...bandColumns('warming_avoided', 'degC'),
      ...foods.map((f) => `warming_avoided_${f.name}_degC`),
    ],
    rows: tp.years
      .map((year, i) => ({ year, i }))
      .filter(({ year }) => year >= currentYear)
      .map(({ year, i }) => [
        year,
        tp.avoided.median[i],
        tp.avoided.p05[i],
        tp.avoided.p95[i],
        ...foods.map((f) => f.series[i]),
      ]),
  };
};

type Table = { header: string[]; rows: Cell[][] } | null;

/** The surface ocean's pH each year to 2100, modelled and modelled with levers (from now), median and range. */
export const oceanRows = (
  result: ScenarioResult,
  currentYear: number,
  observed?: Series,
): Table => {
  const o = result.ocean;
  const columns = (name: string) => ['median', 'p05', 'p95'].map((q) => `ph_${name}_${q}`);
  const at = (band: SeaLevelBand, i: number) => [band.median[i], band.low[i], band.high[i]];
  return o
    ? {
        header: ['year', 'ph_observed', ...columns('without_levers'), ...columns('with_levers')],
        rows: o.years.map((year, i) => [
          year,
          observed?.values[observed.years.indexOf(year)] ?? null,
          ...at(o.baseline, i),
          ...(year < currentYear ? [null, null, null] : at(o.scenario, i)),
        ]),
      }
    : null;
};

/**
 * The observed sea level from 1900, the modelled rise from 2000 and the rise with levers from now
 * to 2100, cm above 1900 (above 1995–2014 without the observed record), median and likely range.
 */
export const seaLevelRows = (
  result: ScenarioResult,
  currentYear: number,
  observed?: Series,
): Table => {
  const s = result.seaLevel;
  const cm = (m: number | null | undefined) => (m === undefined || m === null ? null : m * 100);
  const columns = (name: string) =>
    ['median', 'p17', 'p83'].map((q) => `sea_level_${name}_${q}_cm`);
  const at = (band: SeaLevelBand, i: number, year: number, from: number) =>
    year < from ? [null, null, null] : [band.median[i], band.low[i], band.high[i]].map(cm);
  const seen = (year: number) => cm(observed?.values[observed.years.indexOf(year)]);
  return s
    ? {
        header: [
          'year',
          'sea_level_observed_cm',
          ...columns('without_levers'),
          ...columns('with_levers'),
        ],
        rows: s.years
          .map((year, i) => ({ year, i }))
          .filter(({ year }) => year >= 1900)
          .map(({ year, i }) => [
            year,
            seen(year),
            ...at(s.baseline, i, year, 2000),
            ...at(s.scenario, i, year, Math.max(2000, currentYear)),
          ]),
      }
    : null;
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
 * Warming by cause (5–95%) and observed temperature under the chosen SSP, with what the run's
 * baseline adds to each cause as on the chart, then each greenhouse gas's warming by cause when
 * the build has it.
 */
export const causeRows = (
  climate: Climate,
  options: Pick<Options, 'ssp' | 'temperature'>,
  temperature?: ScenarioResult['temperature'],
): { header: string[]; rows: Cell[][] } => {
  const attribution = attributionFor(climate, options.ssp, 'all', temperature);
  const causes = attributionColumns(attribution, '');
  const gases = GASES.filter((g) => causeGasesOf(climate).includes(g)).map((g) =>
    attributionColumns(attributionFor(climate, options.ssp, g, temperature), `${g}_`),
  );
  const observed = seriesAt(climate.observed[options.temperature]);
  return {
    header: ['year', ...causes.header, 'observed_degC', ...gases.flatMap((g) => g.header)],
    rows: (attribution.agriculture?.years ?? []).map((year) => [
      year,
      ...causes.at(year),
      observed(year),
      ...gases.flatMap((g) => g.at(year)),
    ]),
  };
};

/** The files the Waste chart reads beside the run. */
export type WasteFiles = Pick<ModelData, 'solidwaste' | 'oceanplastic'>;

export interface ChartInput {
  tab: ChartTab;
  result: ScenarioResult | null;
  climate: Climate;
  scenario: Scenario;
  options: Options;
  currentYear: number;
  waste?: WasteFiles;
}

/**
 * The Waste chart's three views, one row per part of each bar, tonnes a year, then the world's
 * plastic reaching the ocean.
 */
export const wasteRows = (result: ScenarioResult, waste: WasteFiles = {}): Table => {
  const plastic = oceanPlasticTotal(waste.oceanplastic);
  return {
    header: ['view', 'bar', 'part', 'tonnes', 'changed_by_levers'],
    rows: [
      ...WASTE_VIEWS.flatMap((view) =>
        wasteBars(view, result.countries, waste.solidwaste).flatMap((bar) =>
          bar.parts.map((p) => [view, bar.key, p.key, p.tonnes, view === 'food' ? 'yes' : 'no']),
        ),
      ),
      ...(plastic === null ? [] : [['oceanPlastic', 'world', 'plastic', plastic, 'no']]),
    ],
  };
};

/** Each tab's table from a run; the causes' table is read from the data alone. */
const RUN_TABLES: Record<
  Exclude<ChartTab, 'cause'>,
  (r: ScenarioResult, i: ChartInput) => Table
> = {
  temperature: (r, i) => temperatureRows(r, i.climate.naturalOnly, i.currentYear),
  avoided: (r, i) => avoidedRows(r, i.currentYear),
  sealevel: (r, i) => seaLevelRows(r, i.currentYear, i.climate.seaLevel?.observed),
  ocean: (r, i) => oceanRows(r, i.currentYear, i.climate.oceanPhObserved),
  waste: (r, i) => wasteRows(r, i.waste),
};

/** The data of one chart tab as CSV, or null when the model has not run. */
export const chartCsv = (input: ChartInput): DownloadFile | null => {
  const { tab, result, climate, scenario, options } = input;
  const table =
    tab === 'cause'
      ? causeRows(climate, options, result?.temperature)
      : result && RUN_TABLES[tab](result, input);
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
  ccByNc: { name: 'CC BY-NC 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  ccByIgo: { name: 'CC BY 3.0 IGO', url: 'https://creativecommons.org/licenses/by/3.0/igo/' },
  unTerms: { name: 'UN terms of use', url: 'https://www.un.org/en/about-us/terms-of-use' },
};

const pick = (...keys: (keyof typeof LICENCES)[]): Licence[] =>
  keys.map((k) => LICENCES[k]).filter((l): l is Licence => l !== undefined);

/** The files whose terms are not CC BY 4.0. */
const FILE_LICENCES: Readonly<Record<string, readonly string[]>> = {
  climate: ['ccByNcSa'],
  sectors: ['ccByNcSa'],
  industry: ['ccBySa'],
  fossilmethane: ['ccBySa'],
  acidn2o: ['ccBySa'],
  fair: ['ccBySa'],
  population: ['ccByIgo', 'ccBy'],
  waste: ['unTerms'],
  oceanplastic: ['ccByNc'],
  wastemethane: ['ccByNcSa'],
  hfc: ['ccBySa'],
};

/** A data file's terms, as DATA-LICENCES.md gives them. */
export const fileLicences = (file: string): Licence[] =>
  pick(...(FILE_LICENCES[file.replace(/\.json$/, '')] ?? ['ccBy']));

/** LICENSE.txt of the data files' ZIP: each file with its licences, then how to cite. */
export const licenceText = (files: readonly string[], cite: string): string =>
  [
    'Planetshift source data files',
    '',
    ...files.map(
      (f) =>
        `${f}: ${fileLicences(f)
          .map((l) => `${l.name} (${l.url})`)
          .join(' and ')}`,
    ),
    '',
    `How to cite: ${cite}`,
    '',
  ].join('\n');

/** What each download is derived from: the temperatures come from climate.json. */
export const DOWNLOAD_LICENCES = {
  map: pick('ccBy'),
  chart: pick('ccByNcSa'),
  scenario: pick('ccByNcSa'),
};

/** A map layer's CSV terms: the food waste layer's follow waste.json, ocean plastic's its file. */
export const mapLicences = (spec: LayerSpec): Licence[] => {
  const measure = measureOf(spec);
  return measure === 'oceanPlastic'
    ? pick('ccByNc')
    : measure === 'foodWaste'
      ? pick('ccBy', 'unTerms')
      : DOWNLOAD_LICENCES.map;
};

/** A chart tab's CSV terms: the Waste chart's follow its three files, the others climate.json. */
export const chartLicences = (tab: ChartTab): Licence[] =>
  tab === 'waste' ? pick('unTerms', 'ccBy', 'ccByNc') : DOWNLOAD_LICENCES.chart;

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
