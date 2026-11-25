import { describe, expect, it } from 'vitest';
import { scenarioText } from '../../src/chart/cause';
import type { ScenarioResult } from '../../src/model/api';
import { translator } from '../../src/i18n/i18n';

const result = (byCause: Record<string, number>, median: number) =>
  ({
    summary: {
      avoidedWarming2050: { median, p05: median, p95: median },
      byCause: { avoidedWarming2050: byCause },
    },
  }) as unknown as ScenarioResult;

describe('the causes chart headline', () => {
  const lines = { t: translator('en'), locale: 'en-GB' };
  it('names the causes that show at two decimals, biggest first, and leaves out the rest', () => {
    const text = scenarioText(
      lines,
      result({ agriculture: 0.06, waste: 0.012, landUse: 0.004, fossilIndustry: 0 }, 0.076),
      'ssp245',
      2050,
    );
    expect(text).toContain('Farming');
    expect(text.indexOf('Farming')).toBeLessThan(text.indexOf('Waste'));
    expect(text).not.toContain('Land use');
    expect(text).not.toContain('Fossil fuels');
  });
  it('says nothing when the levers avoid too little to tell', () => {
    expect(scenarioText(lines, result({ agriculture: 0.0001 }, 0.0001), 'ssp245', 2050)).toBe('');
  });
});
