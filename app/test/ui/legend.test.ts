import { describe, expect, it } from 'vitest';
import { causeKeys, type AttributionView } from '../../src/chart/attribution';
import type { Attribution } from '../../src/chart/series';
import type { BandSeries } from '../../src/data/types';
import { translator } from '../../src/i18n/i18n';

const band = (median: number): BandSeries => ({
  years: [2100],
  median: [median],
  p05: [median],
  p95: [median],
});
const view = (gas: AttributionView['gas'], attribution: Attribution) =>
  ({ gas, attribution, end: 2100 }) as AttributionView;
const labels = (locale: 'en' | 'fr', v: AttributionView) =>
  causeKeys(translator(locale), locale, v).map((k) => k.toggle);

describe('the causes legend', () => {
  it('lists the causes alphabetically, whatever their size, so switching gases keeps the order', () => {
    const co2 = { fossilIndustry: band(1), landUse: band(0.1), agriculture: band(0.01) };
    const ch4 = { fossilIndustry: band(0.1), landUse: band(0), agriculture: band(0.3) };
    expect(labels('en', view('co2', co2))).toEqual(['agriculture', 'fossilIndustry', 'landUse']);
    expect(labels('en', view('ch4', ch4))).toEqual(labels('en', view('co2', co2)));
  });
  it('sorts by the labels of the language shown', () => {
    const all = { fossilIndustry: band(1), agriculture: band(0.2), natural: band(0) };
    expect(labels('fr', view('all', all))).toEqual(
      [...labels('fr', view('all', all))].sort((a, b) =>
        translator('fr')(`link.causes.${a}`).localeCompare(
          translator('fr')(`link.causes.${b}`),
          'fr',
        ),
      ),
    );
  });
});
