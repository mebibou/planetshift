import type { ChartTab } from '../../src/app/url';
import { describe, expect, it } from 'vitest';
import {
  BOM,
  chartCsv,
  citation,
  csvCell,
  csvNumber,
  fileLicences,
  licenceText,
  layerSlug,
  mapCsv,
  MAP_HEADER,
  scenarioJson,
  scenarioSlug,
  toCsv,
  unitOf,
} from '../../src/app/download';
import { DEFAULT_UI } from '../../src/app/url';
import { zipBlob } from '../../src/app/zip';
import { strFromU8, unzipSync } from 'fflate';
import type { Climate, Meta } from '../../src/data/types';
import type { LayerSpec } from '../../src/map/layers';
import { DEFAULT_OPTIONS, type Scenario, type ScenarioResult } from '../../src/model/api';
import { BASE_SCENARIO } from '../../src/model/scenarios';

const spec = (over: Partial<LayerSpec> = {}): LayerSpec => ({
  layer: 'change',
  changeOf: 'emissions',
  group: 'all',
  gas: 'co2e',
  ...over,
});

const scenario: Scenario = { ...BASE_SCENARIO, shift: 0.4, rampEnd: 2035 };
const lines = (text: string) => text.replace(BOM, '').trimEnd().split('\r\n');

describe('csv', () => {
  it('starts with a byte order mark and ends lines with CRLF', () => {
    const text = toCsv(['a', 'b'], [[1, 'x']]);
    expect(text.startsWith('﻿a,b\r\n')).toBe(true);
    expect(text).toBe('﻿a,b\r\n1,x\r\n');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('Korea, Republic of')).toBe('"Korea, Republic of"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell('cr\rhere')).toBe('"cr\rhere"');
    expect(csvCell("Côte d'Ivoire")).toBe("Côte d'Ivoire");
  });

  it('writes plain numbers with seven significant digits and leaves missing values empty', () => {
    expect(csvNumber(1234567.891)).toBe('1234568');
    expect(csvNumber(0.1 + 0.2)).toBe('0.3');
    expect(csvNumber(-0.000012345678)).toBe('-0.00001234568');
    expect(csvNumber(5e21)).toBe('5e+21');
    expect(csvNumber(Number.NaN)).toBe('');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(12000)).toBe('12000');
  });
});

describe('map csv', () => {
  const rows = [
    {
      iso3: 'KOR',
      name: 'Korea, Republic of',
      names: [],
      before: 1000,
      after: 900,
      change: -0.1,
      tier: 3 as const,
      source: 'https://www.fao.org/faostat/en/#data/GLE',
      beyond: {
        chainBefore: 50,
        chainAfter: 40,
        clearingBefore: 30,
        clearingAfter: 20,
        drainedBefore: 8,
        drainedAfter: 6,
      },
    },
    {
      iso3: 'ATA',
      name: 'Antarctica',
      names: [],
      before: 0,
      after: 0,
      change: null,
      tier: null,
      source: null,
      beyond: {
        chainBefore: null,
        chainAfter: null,
        clearingBefore: null,
        clearingAfter: null,
        drainedBefore: null,
        drainedAfter: null,
      },
    },
  ];

  it('has one row per country under a stable English header', () => {
    const file = mapCsv(rows, spec(), scenario);
    expect(file.name).toBe('planetshift-map-change-emissions-co2e-shift40-2035.csv');
    expect(file.type).toContain('text/csv');
    const [header, kor, ata] = lines(file.text);
    expect(header).toBe(MAP_HEADER.join(','));
    expect(kor).toBe(
      'KOR,"Korea, Republic of",change,emissions,co2e,kg CO2e (GWP100),1000,900,-0.1,3,https://www.fao.org/faostat/en/#data/GLE,50,40,30,20,8,6',
    );
    expect(ata).toBe('ATA,Antarctica,change,emissions,co2e,kg CO2e (GWP100),0,0,,,,,,,,,');
  });

  it('names the layer, its selection and unit', () => {
    expect(layerSlug(spec({ layer: 'production', group: 'dairy' }))).toBe('production-dairy');
    expect(layerSlug(spec({ layer: 'production' }))).toBe('production');
    expect(layerSlug(spec({ layer: 'land' }))).toBe('land');
    expect(layerSlug(spec({ layer: 'quality' }))).toBe('quality');
    expect(layerSlug(spec({ layer: 'emissions', gas: 'ch4' }))).toBe('emissions-ch4');
    expect(unitOf('emissions', spec({ gas: 'n2o' }))).toBe('kg N2O');
    expect(unitOf('production', spec())).toBe('t');
    expect(unitOf('land', spec())).toBe('ha');
    expect(unitOf('deforestation', spec())).toBe('ha');
    expect(unitOf('landShare', spec())).toBe('share of land area');
    expect(unitOf('landCo2', spec())).toBe('kg CO2');
  });

  it('names the scenario by its shift, year, foods and levers', () => {
    expect(scenarioSlug(BASE_SCENARIO)).toMatch(/^shift0-\d{4}$/);
    expect(
      scenarioSlug({ ...scenario, groupShifts: { dairy: 0.1 }, levers: { a: 0.5, b: 0 } }),
    ).toBe('shift40-2035-foods1-levers1');
  });
});

const years = [2025, 2026, 2027];
const band = (v: number) => ({
  median: years.map(() => v),
  p05: years.map(() => v - 1),
  p95: years.map(() => v + 1),
});
const result = {
  temperature: {
    years,
    observed: [1.2, null, null],
    baseline: band(2),
    scenario: band(1.5),
    avoided: band(0.5),
  },
  summary: { avoidedCo2e: 7 },
} as unknown as ScenarioResult;
const series = (v: number) => ({ years, values: years.map(() => v) });
const bandSeries = (v: number) => ({ years, ...band(v) });
const climate = {
  observed: { hadcrut5: series(1.1), berkeley: series(1.3) },
  attribution: {
    ssp245: {
      fossilIndustry: bandSeries(1),
      agriculture: bandSeries(0.3),
      landUse: bandSeries(0.1),
      other: bandSeries(-0.2),
    },
  },
  attributionByGas: {
    ssp245: {
      co2: { fossilIndustry: bandSeries(0.9), landUse: bandSeries(0.1), other: bandSeries(0) },
      ch4: { agriculture: bandSeries(0.2), other: bandSeries(0.1) },
      n2o: { agriculture: bandSeries(0.05), other: bandSeries(0.01) },
    },
  },
  naturalOnly: { years: [2026], median: [0.01], p05: [0], p95: [0.02] },
} as unknown as Climate;
const chart = (tab: ChartTab, r: ScenarioResult | null = result) =>
  chartCsv({
    tab,
    result: r,
    climate,
    scenario,
    options: { ...DEFAULT_OPTIONS, ssp: 'ssp245' },
    currentYear: 2026,
  });

describe('chart csv', () => {
  it('gives the temperature with bands and natural factors by year, without the causes', () => {
    const file = chart('temperature');
    expect(file?.name).toBe('planetshift-temperature-shift40-2035.csv');
    const [header, first, second] = lines(file?.text ?? '');
    expect(header).toBe(
      'year,observed_degC,without_levers_median_degC,without_levers_p05_degC,without_levers_p95_degC,with_levers_median_degC,with_levers_p05_degC,with_levers_p95_degC,natural_only_median_degC,natural_only_p05_degC,natural_only_p95_degC',
    );
    // The levers act from the current year (2026), so 2025 has nothing with them.
    expect(first).toBe('2025,1.2,2,1,3,,,,,,');
    expect(second).toBe('2026,,2,1,3,1.5,0.5,2.5,0.01,0,0.02');
  });

  it('adds the world population the chart draws, the history then the path ahead', () => {
    const population = {
      variant: 'medium',
      history: { years: [2025], values: [8.2e9] },
      variants: { medium: { years: [2026], values: [8.3e9] } },
      people: { years: [2026], values: [4e9] },
    };
    const withPeople = { ...result, population } as unknown as ScenarioResult;
    const [header, first, second] = lines(chart('temperature', withPeople)?.text ?? '');
    expect(header?.split(',').at(-1)).toBe('world_population_people');
    expect(first?.split(',').at(-1)).toBe('8200000000');
    expect(second?.split(',').at(-1)).toBe('4000000000');
  });

  it('gives the warming avoided from the current year', () => {
    const [header, ...rows] = lines(chart('avoided')?.text ?? '');
    expect(header).toBe(
      'year,warming_avoided_median_degC,warming_avoided_p05_degC,warming_avoided_p95_degC',
    );
    expect(rows).toEqual(['2026,0.5,-0.5,1.5', '2027,0.5,-0.5,1.5']);
  });

  it('gives the modelled rise from 2000 and with levers from the current year in cm, or nothing without it', () => {
    const band = (k: number) => ({
      median: [k, 2 * k, 3 * k],
      low: [0, k, 2 * k],
      high: [k, 3 * k, 4 * k],
    });
    const withSea = {
      ...result,
      seaLevel: { years: [1999, 2000, 2026], baseline: band(0.01), scenario: band(0.005) },
    } as unknown as ScenarioResult;
    const [header, ...rows] = lines(chart('sealevel', withSea)?.text ?? '');
    expect(header?.split(',')).toEqual([
      'year',
      'sea_level_observed_cm',
      ...['without_levers', 'with_levers'].flatMap((w) =>
        ['median', 'p17', 'p83'].map((q) => `sea_level_${w}_${q}_cm`),
      ),
    ]);
    expect(rows).toEqual(['1999,,,,,,,', '2000,,2,1,3,,,', '2026,,3,2,4,1.5,1,2']);
    expect(chart('sealevel')).toBeNull();
  });

  it('gives the observed sea level from the climate data', () => {
    const withSea = {
      ...result,
      seaLevel: {
        years: [2000],
        baseline: { median: [0.2], low: [0.1], high: [0.3] },
        scenario: { median: [0.2], low: [0.1], high: [0.3] },
      },
    } as unknown as ScenarioResult;
    const file = chartCsv({
      tab: 'sealevel',
      result: withSea,
      climate: { ...climate, seaLevel: { observed: { years: [2000], values: [0.15] } } } as Climate,
      scenario,
      options: { ...DEFAULT_OPTIONS, ssp: 'ssp245' },
      currentYear: 2026,
    });
    expect(
      lines(file?.text ?? '')[1]
        ?.split(',')
        .slice(0, 2),
    ).toEqual(['2000', '15']);
  });

  it('gives warming by cause from the climate data, even before the model has run', () => {
    const file = chart('cause', null) ?? expect.fail('no file');
    expect(file.name).toBe('planetshift-cause-ssp245.csv');
    const [header, first] = lines(file.text) as [string, string];
    expect(header.split(',')).toHaveLength(1 + 12 + 1 + 7 * 3);
    expect(header).toContain('warming_agriculture_p95_degC');
    expect(header).toContain('observed_degC,warming_co2_fossilIndustry_median_degC');
    expect(header.endsWith('warming_n2o_other_p95_degC')).toBe(true);
    expect(first.startsWith('2025,1,0,2,0.3,')).toBe(true);
    expect(
      first.endsWith(
        ',1.1,0.9,-0.1,1.9,0.1,-0.9,1.1,0,-1,1,0.2,-0.8,1.2,0.1,-0.9,1.1,0.05,-0.95,1.05,0.01,-0.99,1.01',
      ),
    ).toBe(true);
  });

  it('gives no gas columns for a build without the split by gas', () => {
    const older = { ...climate, attributionByGas: undefined };
    const file = chartCsv({
      tab: 'cause',
      result: null,
      climate: older as Climate,
      scenario,
      options: DEFAULT_OPTIONS,
      currentYear: 2026,
    });
    const [header] = lines(file?.text ?? '');
    expect(header?.split(',')).toHaveLength(1 + 12 + 1);
  });

  it('has nothing to give for the model’s charts before it runs', () => {
    expect(chart('temperature', null)).toBeNull();
    expect(chart('avoided', null)).toBeNull();
  });
});

const meta: Meta = {
  baseYear: 2023,
  builtAt: '2026-11-22',
  sources: [
    { id: 'a', name: 'FAOSTAT', version: '1', url: 'https://fao.org', licence: 'CC BY 4.0' },
    { id: 'b', name: 'HadCRUT5', version: '5', url: 'https://x', licence: 'OGL' },
  ],
};

describe('scenario json and licences', () => {
  it('holds the URL state, the summary, the licence and how to cite', () => {
    const file = scenarioJson({
      url: 'https://example.org/?shift=40',
      query: '?shift=40',
      scenario,
      options: DEFAULT_OPTIONS,
      ui: { ...DEFAULT_UI, mapView: 'table' },
      result,
      meta,
    });
    expect(file.name).toBe('planetshift-scenario-shift40-2035.json');
    const json = JSON.parse(file.text);
    expect(json).toMatchObject({
      app: 'Planetshift',
      query: '?shift=40',
      scenario: { shift: 0.4, rampEnd: 2035 },
      view: { mapView: 'table' },
      summary: { avoidedCo2e: 7 },
      licence: [{ name: 'CC BY-NC-SA 4.0' }],
    });
    expect(json.citation).toBe(
      'Planetshift (2026), https://example.org/?shift=40. Data: FAOSTAT; HadCRUT5.',
    );
    expect(citation(meta, 'u')).toContain('FAOSTAT; HadCRUT5');
  });

  it('gives each data file the terms DATA-LICENCES.md sets', () => {
    const names = (f: string) => fileLicences(f).map((l) => l.name);
    expect(names('climate.json')).toEqual(['CC BY-NC-SA 4.0']);
    expect(names('sectors.json')).toEqual(['CC BY-NC-SA 4.0']);
    expect(names('industry.json')).toEqual(['CC BY-SA 4.0']);
    expect(names('fair.json')).toEqual(['CC BY-SA 4.0']);
    expect(names('population.json')).toEqual(['CC BY 3.0 IGO', 'CC BY 4.0']);
    expect(names('supply.json')).toEqual(['CC BY 4.0']);
    expect(names('waste.json')).toEqual(['UN terms of use']);
    expect(names('impacts.json')).toEqual(['CC BY 4.0']);
  });
});

describe('the data files as a ZIP', () => {
  it('lists each file with its licences, then how to cite', () => {
    const text = licenceText(['climate.json', 'population.json'], 'Planetshift (2026).');
    expect(text).toContain(
      'climate.json: CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)',
    );
    expect(text).toContain('population.json: CC BY 3.0 IGO (');
    expect(text).toContain(') and CC BY 4.0 (');
    expect(text.trimEnd().split('\n').at(-1)).toBe('How to cite: Planetshift (2026).');
  });

  it('holds every file as it was given', async () => {
    const blob = await zipBlob({ 'a.json': '{"é":1}', 'LICENSE.txt': 'x' });
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(entries)).toEqual(['a.json', 'LICENSE.txt']);
    expect(strFromU8(entries['a.json']!)).toBe('{"é":1}');
  });
});
