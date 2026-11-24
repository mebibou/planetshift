import { describe, expect, it } from 'vitest';
import { attributionFor, causesAt } from '../../src/chart/series';
import type { Options } from '../../src/model/api';
import { data, run } from '../levers';

/** The stacked causes and the line without the levers in a year. */
const stackAndLine = (options: Partial<Options>, year: number) => {
  const r = run({}, options);
  const attribution = attributionFor(data.climate, 'ssp245', 'all', r.temperature);
  return {
    stack: causesAt(attribution, year)?.total,
    line: r.temperature.baseline.median[r.temperature.years.indexOf(year)],
    attribution,
  };
};

describe('the causes of warming', () => {
  it('add up to the line without the levers, whatever the baseline adds', () => {
    [{}, { baseline: 'ssp2' as const }, { permafrost: 'off' as const }, { people: 0 }].forEach(
      (options) => {
        const { stack, line } = stackAndLine(options, 2100);
        expect(stack).toBeCloseTo(line as number, 9);
      },
    );
  });

  it('shows permafrost as its own cause, on by default, and none when it is off', () => {
    expect(stackAndLine({}, 2100).attribution.permafrost).toBeDefined();
    expect(stackAndLine({ permafrost: 'off' }, 2100).attribution.permafrost).toBeUndefined();
  });
});
