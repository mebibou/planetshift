import { describe, expect, it } from 'vitest';
import {
  DIET_GROUP,
  groupsLevel,
  groupValues,
  levelOf,
  withGroupsAt,
} from '../../src/controls/adoption';
import { PANEL_MODULES } from '../../src/levers/registry';
import { BASE_SCENARIO } from '../../src/model/scenarios';

const ids = PANEL_MODULES.map((m) => m.id);
const practices = PANEL_MODULES.find((m) => m.id === 'practices');

describe('the quick 0% / 100% pairs', () => {
  it('tell zero, full and mixed apart', () => {
    expect(levelOf([0, 0])).toBe('zero');
    expect(levelOf([1, 1])).toBe('full');
    expect(levelOf([0, 1])).toBe('mixed');
    expect(levelOf([0.5])).toBe('mixed');
  });

  it('read the diet’s main shift and each food’s share, set apart or not', () => {
    expect(groupsLevel(BASE_SCENARIO, [DIET_GROUP])).toBe('zero');
    expect(groupsLevel({ ...BASE_SCENARIO, shift: 1 }, [DIET_GROUP])).toBe('full');
    expect(
      groupsLevel({ ...BASE_SCENARIO, shift: 1, groupShifts: { dairy: 0.5 } }, [DIET_GROUP]),
    ).toBe('mixed');
    expect(groupsLevel({ ...BASE_SCENARIO, groupShifts: { dairy: 0.2 } }, [DIET_GROUP])).toBe(
      'mixed',
    );
  });

  it('read a module’s levers, unset ones at 0', () => {
    expect(
      practices && groupValues({ ...BASE_SCENARIO, levers: { feedAdditives: 0.4 } }, 'practices'),
    ).toHaveLength(practices?.levers.length ?? -1);
    expect(groupsLevel({ ...BASE_SCENARIO, levers: { feedAdditives: 0.4 } }, ['practices'])).toBe(
      'mixed',
    );
    expect(groupValues(BASE_SCENARIO, 'unknown')).toEqual([]);
  });

  it('set every group of the set and leave the others', () => {
    const full = withGroupsAt(BASE_SCENARIO, ['practices'], 1);
    expect(groupsLevel(full, ['practices'])).toBe('full');
    expect(groupsLevel(full, ['energy'])).toBe('zero');
    expect(Object.keys(full.levers).sort()).toEqual(practices?.levers.map((l) => l.id).sort());
    expect(withGroupsAt(full, ['practices'], 0).levers).toEqual({});
  });

  it('move the diet with its foods set apart, clearing them', () => {
    const s = withGroupsAt(
      { ...BASE_SCENARIO, shift: 0.3, groupShifts: { dairy: 0.2 } },
      [DIET_GROUP],
      1,
    );
    expect(s.shift).toBe(1);
    expect(s.groupShifts).toEqual({});
    expect(withGroupsAt(s, [DIET_GROUP], 0)).toMatchObject({ shift: 0, groupShifts: {} });
  });

  it('set every lever and the diet at once, keeping the rest of the scenario', () => {
    const all = withGroupsAt({ ...BASE_SCENARIO, rampEnd: 2040 }, [DIET_GROUP, ...ids], 1);
    expect(groupsLevel(all, [DIET_GROUP, ...ids])).toBe('full');
    expect(all.rampEnd).toBe(2040);
    expect(groupsLevel(withGroupsAt(all, [DIET_GROUP, ...ids], 0), [DIET_GROUP, ...ids])).toBe(
      'zero',
    );
  });
});
