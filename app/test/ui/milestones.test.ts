import { describe, expect, it } from 'vitest';
import { centredMean, crossingYear, gapClosed, milestones, peakOf } from '../../src/app/milestones';
import { crossingLine, gapLine, peakLine } from '../../src/app/summary';
import { translator } from '../../src/i18n/i18n';
import type { ScenarioResult } from '../../src/model/api';

const years = Array.from({ length: 251 }, (_, i) => 1850 + i);
/** Flat at 0 to 2000, then up 0.03 °C a year; its 20-year mean lags half a year behind. */
const ramp = (rate = 0.03) => years.map((y) => Math.max(0, (y - 2000) * rate));

const temperature = (
  baseline: number[],
  scenario: number[],
  spread = 0.1,
): ScenarioResult['temperature'] => ({
  years,
  observed: [],
  baseline: { median: baseline, p05: baseline, p95: baseline },
  scenario: {
    median: scenario,
    p05: scenario.map((v) => v - spread),
    p95: scenario.map((v) => v + spread),
  },
  agricultureBaseline: [],
  agricultureScenario: [],
  avoided: { median: [], p05: [], p95: [] },
  avoidedByCause: { fossilIndustry: [], agriculture: [], landUse: [], airPollution: [] },
});

describe('milestones', () => {
  it('takes a centred 20-year mean, shorter at the ends', () => {
    expect(centredMean([1, 1, 1, 1])).toEqual([1, 1, 1, 1]);
    const line = Array.from({ length: 40 }, (_, i) => i);
    expect(centredMean(line)[20]).toBeCloseTo(19.5);
    expect(centredMean(line)[0]).toBeCloseTo(4.5);
  });

  it('finds the first year the mean reaches a level, or none', () => {
    expect(crossingYear(years, ramp(), 1.5)).toBe(2051);
    expect(crossingYear(years, ramp(), 2)).toBe(2068);
    expect(crossingYear(years, ramp(0.001), 1.5)).toBeNull();
  });

  it('shares out the gap to a target, or none when the baseline is below it', () => {
    expect(gapClosed(2.75, 2.49, 2)).toBeCloseTo(0.26 / 0.75);
    expect(gapClosed(2.75, 2.49, 1.5)).toBeCloseTo(0.26 / 1.25);
    expect(gapClosed(1.9, 1.8, 2)).toBeNull();
  });

  it('finds the peak from a year on, and whether it is still rising', () => {
    const hump = years.map((y) => 2 - ((y - 2070) / 50) ** 2);
    expect(peakOf(years, hump, 2026)).toEqual({ year: 2070, value: 2, rising: false });
    expect(peakOf(years, ramp(), 2026)).toMatchObject({ year: 2100, rising: true });
  });

  it('gives each level its crossing years, range and gap closed', () => {
    const base = ramp();
    const scen = base.map((v) => v * 0.9);
    const m = milestones(temperature(base, scen), 2026);
    const [p15, p2] = m.levels;
    expect(p15).toMatchObject({ level: 1.5, baseline: 2051 });
    expect(p15?.scenario).toBeGreaterThan(2051);
    expect(p15?.early).toBeLessThan(p15?.scenario ?? 0);
    expect(p15?.late).toBeGreaterThan(p15?.scenario ?? 0);
    expect(p2?.closed).toBeCloseTo((3 - 2.7) / (3 - 2));
    expect(m.peak).toMatchObject({ year: 2100, rising: true });
  });
});

describe('milestone lines', () => {
  const tr = translator('en');
  const t: typeof tr = (key, params) => tr(key, params).replace(/\u00a0/g, ' ');
  const level = {
    level: 1.5 as const,
    baseline: 2034,
    scenario: 2046,
    early: 2040,
    late: 2052,
    closed: 0.21,
  };

  it('says when a level is reached without and with the levers', () => {
    expect(crossingLine(level, 2100, t, 'en-GB')).toBe(
      '1.5 °C: around 2034 without the levers, around 2046 with them (likely 2040–2052).',
    );
    expect(
      crossingLine({ ...level, scenario: 2034, early: 2030, late: 2038 }, 2100, t, 'en-GB'),
    ).toBe('1.5 °C: reached around 2034 (likely 2030–2038).');
    expect(crossingLine({ ...level, level: 2, scenario: null, late: null }, 2100, t, 'en-GB')).toBe(
      '2 °C: around 2034 without the levers, not before 2100 with them (likely from 2040).',
    );
    expect(
      crossingLine(
        { ...level, baseline: null, scenario: null, early: null, late: null },
        2100,
        t,
        'en-GB',
      ),
    ).toBe('1.5 °C: not reached before 2100, with or without the levers.');
  });

  it('gives the gap closed for each level and the peak', () => {
    const ms = {
      end: 2100,
      levels: [level, { ...level, level: 2 as const, closed: null }],
      peak: { year: 2071, value: 1.94, rising: false },
    };
    expect(gapLine(ms, t, 'en-GB')).toBe(
      'Gap closed in 2100: 21% of the gap to 1.5 °C, below 2 °C even without the levers.',
    );
    expect(peakLine(ms, t, 'en-GB')).toBe('Peak warming with the levers: 1.94 °C in 2071.');
    expect(peakLine({ ...ms, peak: { year: 2100, value: 2.6, rising: true } }, t, 'en-GB')).toBe(
      'With the levers, warming is still rising in 2100: 2.60 °C.',
    );
  });
});
