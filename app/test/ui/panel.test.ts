import { describe, expect, it } from 'vitest';
import { adoptedCount } from '../../src/controls/panelModel';
import { changedOptions } from '../../src/controls/panelModel';
import { dietMeta } from '../../src/controls/panelModel';
import { PANEL_MODULES } from '../../src/levers/registry';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import { BASE_SCENARIO } from '../../src/model/scenarios';

describe('the panel groups’ summary lines', () => {
  it('says whether the diet moves, by when, and whether foods are set apart', () => {
    expect(dietMeta(BASE_SCENARIO).key).toBe('diet.none');
    expect(dietMeta({ ...BASE_SCENARIO, shift: 0.5 })).toEqual({
      key: 'diet.moved',
      params: { share: 0.5, year: 2035 },
    });
    expect(dietMeta({ ...BASE_SCENARIO, groupShifts: { dairy: 0.3 } }).key).toBe('diet.movedOwn');
  });

  it('counts the levers adopted and the options changed', () => {
    const practices = PANEL_MODULES.find((m) => m.id === 'practices');
    expect(practices && adoptedCount({ feedAdditives: 0.2, riceWater: 0 }, practices)).toBe(1);
    expect(changedOptions(DEFAULT_OPTIONS)).toBe(0);
    expect(changedOptions({ ...DEFAULT_OPTIONS, ssp: 'ssp126', permafrost: 'off' })).toBe(2);
  });
});
