import { describe, expect, it } from 'vitest';
import {
  chartLicences,
  fileLicences,
  layerSlug,
  mapLicences,
  wasteRows,
} from '../../src/app/download';
import { foodBars, municipalBars, oceanPlasticTotal } from '../../src/chart/wasteBars';
import type { SolidWaste, SolidWasteCountry } from '../../src/data/types';
import { translator } from '../../src/i18n/i18n';
import { beforeAfter, layerValue, measureOf, type LayerSpec } from '../../src/map/layers';
import { columnsOf, defaultSort, tableRows } from '../../src/map/table';
import { tooltipModel } from '../../src/map/tooltip';
import type { ScenarioResult } from '../../src/model/api';
import { countryResult } from './fakes';

const t = translator('en');

const spec = (wasteOf: LayerSpec['wasteOf']): LayerSpec => ({
  layer: 'waste',
  changeOf: 'production',
  group: 'all',
  gas: 'co2e',
  wasteOf,
});

const stages = { losses: 100, retail: 10, foodService: 20, household: 70 };
const municipal = (over: Partial<SolidWasteCountry> = {}): SolidWasteCountry => ({
  tonnes: 1000,
  kgPerPerson: 500,
  income: 'high',
  types: {
    foodGreen: 0.4,
    paper: 0.2,
    plastic: 0.1,
    glass: 0.1,
    metal: 0.1,
    textiles: 0,
    other: 0.1,
  },
  treatment: {
    landfill: 0.5,
    openDump: 0,
    incineration: 0.2,
    recycling: 0.3,
    composting: 0,
    other: 0,
    uncollected: 0,
  },
  ...over,
});

const fra = countryResult({
  foodWaste: stages,
  foodWasteChange: { losses: -50, retail: -5, foodService: -10, household: -35 },
  municipalWaste: municipal(),
  oceanPlastic: 12,
});

describe('the waste layer', () => {
  it('measures food lost and wasted before and after the levers', () => {
    expect(measureOf(spec('food'))).toBe('foodWaste');
    expect(beforeAfter(fra, spec('food'))).toEqual({ kind: 'foodWaste', before: 200, after: 100 });
  });

  it('keeps municipal waste and ocean plastic as they are with the levers', () => {
    expect(beforeAfter(fra, spec('municipal'))).toEqual({
      kind: 'municipalWaste',
      before: 1000,
      after: 1000,
    });
    expect(layerValue(fra, spec('plastic'))).toBe(12);
  });

  it('has no value for a country without the data, and leaves it out of the table', () => {
    const bare = countryResult();
    expect(layerValue(bare, spec('municipal'))).toBeNull();
    expect(layerValue(bare, spec('plastic'))).toBeNull();
    expect(layerValue(bare, spec('food'))).toBeNull();
    const rows = tableRows(
      [fra, bare],
      spec('plastic'),
      (iso3) => ({ name: iso3, names: [] }),
      () => null,
    );
    expect(rows.map((r) => r.iso3)).toEqual(['FRA']);
  });

  it('shows today alone in the table for what no lever changes', () => {
    expect(columnsOf(spec('municipal'))).toEqual(['name', 'before']);
    expect(defaultSort(spec('plastic')).column).toBe('before');
    expect(columnsOf(spec('food'))).toEqual(['name', 'before', 'after', 'change']);
  });

  it('gives each food stage in the tooltip, and says the levers leave municipal waste', () => {
    const food = tooltipModel('France', fra, spec('food'), t, 'en-GB');
    expect(food.rows).toContainEqual(['Wasted at home', '70 t → 35 t']);
    const m = tooltipModel('France', fra, spec('municipal'), t, 'en-GB');
    expect(m.rows).toContainEqual(['No lever changes it', '']);
    expect(m.rows).toContainEqual(['Food and green', '40%']);
    expect(m.rows).not.toContainEqual(expect.arrayContaining(['With the levers']));
    expect(m.source?.label).toBe('What a Waste 3.0');
    expect(tooltipModel('France', countryResult(), spec('plastic'), t, 'en-GB').rows).toEqual([
      ['No data for this country', ''],
    ]);
  });

  it('names its CSV after the waste shown, under that data’s terms', () => {
    expect(layerSlug(spec('plastic'))).toBe('waste-plastic');
    expect(mapLicences(spec('plastic')).map((l) => l.name)).toEqual(['CC BY-NC 4.0']);
    expect(mapLicences(spec('food')).map((l) => l.name)).toEqual(['CC BY 4.0', 'UN terms of use']);
    expect(fileLicences('oceanplastic.json').map((l) => l.name)).toEqual(['CC BY-NC 4.0']);
    expect(fileLicences('solidwaste.json').map((l) => l.name)).toEqual(['CC BY 4.0']);
    expect(chartLicences('waste')).toHaveLength(3);
  });
});

const file: SolidWaste = {
  year: 2022,
  byCountry: {
    AAA: municipal(),
    BBB: municipal({ tonnes: 500, income: 'low' }),
  },
  source: '',
};

describe('the Waste chart', () => {
  it('stacks the world’s food stages today and with the levers', () => {
    const [today, levers] = foodBars([fra, fra]);
    expect(today?.parts.map((p) => p.tonnes)).toEqual([200, 20, 40, 140]);
    expect(levers?.parts.map((p) => p.tonnes)).toEqual([100, 10, 20, 70]);
  });

  it('stacks municipal waste for the world and each income group', () => {
    const bars = municipalBars(file, 'types');
    expect(bars.map((b) => b.key)).toEqual(['world', 'high', 'upperMiddle', 'lowerMiddle', 'low']);
    expect(bars[0]?.parts.find((p) => p.key === 'plastic')?.tonnes).toBeCloseTo(150);
    expect(bars[4]?.parts.find((p) => p.key === 'plastic')?.tonnes).toBeCloseTo(50);
    expect(municipalBars(undefined, 'treatment')).toEqual([]);
    expect(oceanPlasticTotal({ year: 2019, byCountry: { A: 1, B: 2 }, source: '' })).toBe(3);
    expect(oceanPlasticTotal(undefined)).toBeNull();
  });

  it('saves every view and the ocean plastic as CSV rows', () => {
    const result = { countries: [fra] } as unknown as ScenarioResult;
    const table = wasteRows(result, {
      solidwaste: file,
      oceanplastic: { year: 2019, byCountry: { A: 5 }, source: '' },
    });
    expect(table?.header).toEqual(['view', 'bar', 'part', 'tonnes', 'changed_by_levers']);
    expect(table?.rows).toContainEqual(['food', 'levers', 'household', 35, 'yes']);
    expect(table?.rows).toContainEqual(['treatment', 'world', 'recycling', 450, 'no']);
    expect(table?.rows.at(-1)).toEqual(['oceanPlastic', 'world', 'plastic', 5, 'no']);
  });
});
