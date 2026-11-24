import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { SAMPLES } from './samples';
import { decodeState, encodeState } from '../../src/model/state';

const roundTrip = (scenario: Scenario, options: Options) =>
  decodeState(encodeState(scenario, options));

describe('URL state', () => {
  it('is empty for the defaults', () => {
    expect(encodeState(BASE_SCENARIO, DEFAULT_OPTIONS)).toBe('');
    expect(decodeState('')).toEqual({ scenario: BASE_SCENARIO, options: DEFAULT_OPTIONS });
  });
  it.each(SAMPLES.map((p) => [p.id, p.scenario] as const))('round-trips the %s sample', (_, s) =>
    expect(roundTrip(s, DEFAULT_OPTIONS)).toEqual({ scenario: s, options: DEFAULT_OPTIONS }),
  );
  it('round-trips every option', () => {
    const options: Options = {
      scope: 'cradleToFarmGate',
      feed: 'gleam',
      baseline: 'ssp2',
      location: 'domestic',
      temperature: 'berkeley',
      climate: 'ar6',
      ssp: 'ssp370',
      regrowth: 'natural',
      deadfall: 'on',
      dataCentres: 'ssp',
      permafrost: 'on',
      population: 'low',
    };
    const scenario: Scenario = {
      ...BASE_SCENARIO,
      shift: 0.07,
      groupShifts: { eggs: 0.125, pigMeat: 0, seafood: 0.5 },
      basis: 'kcal',
      replacement: 'legumes',
      rampEnd: 2042,
      where: 'highIncome',
    };
    expect(roundTrip(scenario, options)).toEqual({ scenario, options });
  });
  it('is readable', () => {
    expect(
      encodeState(
        { ...BASE_SCENARIO, shift: 0.1, groupShifts: { dairy: 1 }, basis: 'kcal' },
        {
          ...DEFAULT_OPTIONS,
          ssp: 'ssp126',
        },
      ),
    ).toBe('shift=10&dai=100&basis=kcal&ssp=ssp126');
  });
  it('accepts a leading question mark', () => {
    expect(decodeState('?shift=50').scenario.shift).toBe(0.5);
  });
  it('falls back to the defaults on invalid values', () => {
    const { scenario, options } = decodeState(
      'shift=150&rum=abc&basis=fat&ramp=2101&target=swap&swap=fish&scope=x&ssp=ssp585',
    );
    expect(scenario.shift).toBe(0);
    expect(scenario.groupShifts).toEqual({});
    expect(scenario.basis).toBe(BASE_SCENARIO.basis);
    expect(scenario.rampEnd).toBe(BASE_SCENARIO.rampEnd);
    expect(options).toEqual(DEFAULT_OPTIONS);
  });
  it('starts a ramp no earlier than the year after the current one, as the slider does', () => {
    expect(decodeState('ramp=2026', 2026).scenario.rampEnd).toBe(2027);
    expect(decodeState('ramp=2025', 2026).scenario.rampEnd).toBe(2027);
    expect(decodeState('ramp=2030', 2026).scenario.rampEnd).toBe(2030);
    expect(decodeState('', 2040).scenario.rampEnd).toBe(2041);
    expect(decodeState('ramp=2026').scenario.rampEnd).toBe(2026);
  });
  it('reads the regrowth option by its key, and the default when invalid', () => {
    expect(decodeState('regrow=natural').options.regrowth).toBe('natural');
    expect(decodeState('regrow=forest').options.regrowth).toBe(DEFAULT_OPTIONS.regrowth);
    expect(encodeState(BASE_SCENARIO, { ...DEFAULT_OPTIONS, regrowth: 'natural' })).toBe(
      'regrow=natural',
    );
  });
  it('ignores the keys of the removed target modes', () =>
    expect(decodeState('target=eatLancet&swap=eggs')).toEqual(decodeState('')));
});
