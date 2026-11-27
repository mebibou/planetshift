import { describe, expect, it } from 'vitest';
import { fileLicences, layerSlug, mapCsv, mapLicences, unitOf } from '../../src/app/download';
import { parseUi } from '../../src/app/url';
import type { FireCountry, Fires } from '../../src/data/types';
import { translator } from '../../src/i18n/i18n';
import { scaleOf } from '../../src/map/colours';
import {
  beforeAfter,
  hasFireData,
  layerValue,
  measureOf,
  withFires,
  type LayerSpec,
} from '../../src/map/layers';
import { legendBins } from '../../src/map/legend';
import { FIRE_ANOMALY_THRESHOLDS } from '../../src/map/scales';
import { columnsOf, defaultSort, tableRows } from '../../src/map/table';
import { formatMeasure, tooltipModel } from '../../src/map/tooltip';
import { countryResult } from './fakes';

const t = translator('en');

/** Rows with their no-break spaces as plain ones. */
const plain = (rows: [string, string][]) => rows.map(([k, v]) => [k, v.replace(/\u00a0/g, ' ')]);

const spec = (firesOf: LayerSpec['firesOf']): LayerSpec => ({
  layer: 'fires',
  changeOf: 'production',
  group: 'all',
  gas: 'co2e',
  firesOf,
});

const brazil: FireCountry = {
  burned: 102815,
  burnedAnomaly: -0.451,
  forest: 17799.5,
  forestAnomaly: -0.506,
  carbon: 118291687,
  carbonAnomaly: -0.539,
};

const fires: Fires = {
  season: [2025, 2026],
  baseline: { burned: [2002, 2024], carbon: [2003, 2024] },
  byCountry: { BRA: brazil, FRA: { burned: 371.9, burnedAnomaly: 0.007, forest: 4.1 } },
  world: brazil,
  source: '',
};

const [bra, fra, nga] = withFires(
  [countryResult({ iso3: 'BRA' }), countryResult({ iso3: 'FRA' }), countryResult({ iso3: 'NGA' })],
  fires,
);

describe('fires layer', () => {
  it('gives each country of the run its fires, and none without the file', () => {
    expect(bra?.fire).toBe(brazil);
    expect(nga?.fire).toBeUndefined();
    const run = [countryResult()];
    expect(withFires(run, undefined)).toBe(run);
  });

  it('shows the area burned, the forest burned or the carbon, which no lever changes', () => {
    expect(measureOf(spec(undefined))).toBe('fireAnomaly');
    expect(beforeAfter(bra!, spec('forest'))).toEqual({
      kind: 'forestFireAnomaly',
      before: -0.506,
      after: -0.506,
    });
    expect(layerValue(bra!, spec('carbon'))).toBe(118291687);
  });

  it('leaves a country without the figure out, not at zero', () => {
    expect(layerValue(fra!, spec('burned'))).toBe(0.007);
    expect(layerValue(fra!, spec('forest'))).toBeNull();
    expect(layerValue(fra!, spec('carbon'))).toBeNull();
    expect(layerValue(nga!, spec('burned'))).toBeNull();
    expect(hasFireData(bra!, 'production')).toBe(false);
  });

  it('colours the anomalies around the mean and the carbon as a quantity', () => {
    expect(scaleOf(spec('burned')).kind).toBe('diverging');
    expect(scaleOf(spec('forest')).colours[6]).toBe('var(--diverging-7)');
    expect(scaleOf(spec('carbon')).kind).toBe('sequential');
    const labels = legendBins(
      FIRE_ANOMALY_THRESHOLDS,
      scaleOf(spec('burned')).colours,
      formatMeasure('en-GB', 'fireAnomaly'),
    ).map((b) => b.label);
    expect(labels[0]).toBe('< −50%');
    expect(labels[3]).toBe('−10% – +10%');
    expect(labels[6]).toBe('≥ +100%');
  });

  it("tooltips the layer's figure, then the season's three against the mean", () => {
    const m = tooltipModel('Brazil', bra, spec('burned'), t, 'en-GB');
    expect(plain(m.rows)).toEqual([
      ['Area burned against the mean', '−45%'],
      ['Area burned', '10.3 Mha (−45% against the mean)'],
      ['Of which forest', '1.78 Mha (−51% against the mean)'],
      ['Carbon emitted', '118 Mt C (−54% against the mean)'],
      ['No lever changes it', ''],
    ]);
    expect(m.source?.url).toBe('https://doi.org/10.5281/zenodo.21262381');
  });

  it('tooltips a figure without an anomaly alone, and no data without the figure', () => {
    const m = tooltipModel('France', fra, spec('burned'), t, 'en-GB');
    expect(plain(m.rows)).toContainEqual(['Of which forest', '410 ha']);
    expect(m.rows.map(([k]) => k)).not.toContain('Carbon emitted');
    expect(tooltipModel('France', fra, spec('forest'), t, 'en-GB').rows).toEqual([
      ['No data for this country', ''],
    ]);
  });

  it('tables the countries with the figure, one column, largest first', () => {
    const rows = tableRows(
      [bra!, fra!, nga!],
      spec('burned'),
      (iso3) => ({
        name: iso3,
        names: [iso3],
      }),
      () => null,
    );
    expect(rows.map((r) => [r.iso3, r.before])).toEqual([
      ['BRA', -0.451],
      ['FRA', 0.007],
    ]);
    expect(columnsOf(spec('carbon'))).toEqual(['name', 'before']);
    expect(defaultSort(spec('carbon'))).toEqual({ column: 'before', direction: 'descending' });
  });

  it('names the choice and the unit in the CSV, under CC BY like its file', () => {
    expect(layerSlug(spec('forest'))).toBe('fires-forest');
    expect(unitOf('fireCarbon', spec('carbon'))).toContain('t C');
    const scenario = { shift: 0, rampEnd: 2050, levers: {}, groupShifts: {} } as never;
    const rows = tableRows(
      [bra!],
      spec('carbon'),
      (iso3) => ({ name: iso3, names: [] }),
      () => null,
    );
    const line = mapCsv(rows, spec('carbon'), scenario).text.split('\r\n')[1];
    expect(line?.startsWith('BRA,BRA,fires,fireCarbon,carbon,')).toBe(true);
    expect(mapLicences(spec('burned')).map((l) => l.name)).toEqual(['CC BY 4.0']);
    expect(fileLicences('fires.json').map((l) => l.name)).toEqual(['CC BY 4.0']);
  });

  it('keeps the choice in the URL', () => {
    expect(parseUi('?layer=fires&fire=carbon')).toMatchObject({
      layer: 'fires',
      firesOf: 'carbon',
    });
    expect(parseUi('?layer=fires&fire=nope').firesOf).toBe('burned');
  });
});
