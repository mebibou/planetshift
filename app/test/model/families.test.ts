import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../../src/levers/registry';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { activeFamilies, exactShapley, FAMILY_GROUPS, withOnly } from './families';

describe('activeFamilies', () => {
  it('finds none with no shift, no lever and no regrowth', () => {
    expect(activeFamilies(BASE_SCENARIO, {})).toEqual([]);
    expect(activeFamilies({}, { regrowth: 'none' })).toEqual([]);
  });
  it('counts the diet by its shift or any group shift, and regrowth by its option', () => {
    expect(activeFamilies({ shift: 0.2 }, {})).toEqual(['diet']);
    expect(activeFamilies({ shift: 0, groupShifts: { dairy: 0.5 } }, {})).toEqual(['diet']);
    expect(activeFamilies({ groupShifts: { dairy: 0 } }, {})).toEqual([]);
    expect(activeFamilies({}, { regrowth: 'natural' })).toEqual(['regrowth']);
  });
  it('counts a family by its levers adopted, not those at 0', () => {
    expect(activeFamilies({ levers: { hfcPhaseDown: 0, deforestation: 1 } }, {})).toEqual([
      'deforestation',
    ]);
    expect(activeFamilies({ levers: { landfills: 0.5, wastewater: 0 } }, {})).toEqual([
      'wasteMethane',
    ]);
  });
});

describe('withOnly', () => {
  const s = { shift: 0.5, groupShifts: { dairy: 1 }, levers: { deforestation: 1, landfills: 0.5 } };
  it('switches every family outside the coalition off', () => {
    expect(withOnly(['wasteMethane'], s, { regrowth: 'natural' })).toEqual([
      { shift: 0, groupShifts: {}, levers: { deforestation: 0, landfills: 0.5 } },
      { regrowth: 'none' },
    ]);
  });
  it('leaves the families in it as they are', () => {
    const all = withOnly(['diet', 'deforestation', 'wasteMethane', 'regrowth'], s, {
      regrowth: 'natural' as const,
    });
    expect(all).toEqual([s, { regrowth: 'natural' }]);
    expect(activeFamilies(...withOnly([], s, { regrowth: 'natural' }))).toEqual([]);
  });
});

describe('exactShapley', () => {
  it('plays only the active families, each coalition switched on alone', () => {
    const value = (x: { shift?: number; levers?: Record<string, number> }) =>
      (x.shift ?? 0) + 10 * (x.levers?.deforestation ?? 0) + 100 * (x.levers?.hfcPhaseDown ?? 0);
    const exact = exactShapley(
      { shift: 0.5, levers: { deforestation: 1, hfcPhaseDown: 0 } },
      {},
      (x) => [value(x)],
    );
    expect([...exact.keys()]).toEqual(['diet', 'deforestation']);
    expect(exact.get('diet')?.[0]).toBeCloseTo(0.5, 12);
    expect(exact.get('deforestation')?.[0]).toBeCloseTo(10, 12);
  });
});

describe('FAMILY_GROUPS', () => {
  it('cover every family, at most 8 to a group', () => {
    expect(new Set(FAMILY_GROUPS.flat())).toEqual(new Set(FAMILIES));
    FAMILY_GROUPS.forEach((g) => expect(g.length).toBeLessThanOrEqual(8));
  });
  it('keep the families that interact on together', () => {
    const together = (fs: readonly string[]) =>
      FAMILY_GROUPS.some((g) => fs.every((f) => g.includes(f)));
    expect(together(['diet', 'waste', 'plantFoods', 'deforestation'])).toBe(true);
    expect(together(['energy', 'industry', 'dac', 'fossilMethane'])).toBe(true);
  });
});
