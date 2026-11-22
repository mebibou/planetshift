import { describe, expect, it } from 'vitest';
import { panelOrder, type PanelGroup } from '../../src/app/panelOrder';

const GROUPS: PanelGroup[] = [
  { id: 'diet', cause: 'agriculture', worth: 'diet' },
  { id: 'practices', cause: 'agriculture', worth: 'family:practices' },
  { id: 'waste', cause: 'agriculture', worth: 'family:waste' },
  { id: 'deforestation', cause: 'landUse', worth: 'family:deforestation' },
  { id: 'energy', cause: 'fossilIndustry', worth: 'family:energy' },
  { id: 'industry', cause: 'fossilIndustry', worth: 'family:industry' },
];

const WORTH: Record<string, number> = {
  diet: 0.1,
  'family:practices': 0.15,
  'family:waste': 0.02,
  'family:deforestation': 0.05,
  'family:energy': 0.3,
  'family:industry': 0.4,
};

describe('the panel order', () => {
  it('puts the causes biggest first and their groups by what they are worth', () => {
    expect(
      panelOrder(GROUPS, { fossilIndustry: 1.3, agriculture: 0.3, landUse: 0.1 }, (w) => WORTH[w]),
    ).toEqual([
      { cause: 'fossilIndustry', groups: ['industry', 'energy'] },
      { cause: 'agriculture', groups: ['practices', 'diet', 'waste'] },
      { cause: 'landUse', groups: ['deforestation'] },
    ]);
  });
  it('keeps the given order while the figures are unknown', () => {
    expect(
      panelOrder(GROUPS, { fossilIndustry: 0.1, agriculture: 0.3, landUse: 0 }, () => undefined),
    ).toEqual([
      { cause: 'agriculture', groups: ['diet', 'practices', 'waste'] },
      { cause: 'fossilIndustry', groups: ['energy', 'industry'] },
      { cause: 'landUse', groups: ['deforestation'] },
    ]);
  });
  it('leaves out a cause without a group', () => {
    expect(
      panelOrder(
        GROUPS.slice(0, 1),
        { fossilIndustry: 1, agriculture: 0.3, landUse: 0.1 },
        () => 0,
      ),
    ).toEqual([{ cause: 'agriculture', groups: ['diet'] }]);
  });
});
