import { describe, expect, it } from 'vitest';
import { DEFERRED_FILES, EMPTY_LEVER_DATA, LEVER_FILES } from '../../src/data/load';
import { DEFAULT_OPTIONS, type Options } from '../../src/model/api';
import { OPTIONS } from '../../src/model/options';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { loadFixtures } from './fixtures';

const YEAR = 2026;
const SCENARIO = { ...BASE_SCENARIO, shift: 0.2, groupShifts: { ruminantMeat: 0.6 } };
const VARIANTS: Options[] = OPTIONS.flatMap((o) =>
  o.values.map((v) => ({ ...DEFAULT_OPTIONS, [o.field]: v }) as Options),
);

const shown = (file: string | null, options: Options) => {
  const data = loadFixtures();
  const r = runScenario(
    file ? { ...data, [file]: EMPTY_LEVER_DATA[file] } : data,
    SCENARIO,
    options,
    YEAR,
  );
  return JSON.stringify([r.summary, r.temperature.scenario]);
};

describe('deferred files', () => {
  it('leaves at start no file that a run with every lever at 0 reads', () => {
    const full = VARIANTS.map((o) => shown(null, o));
    const read = LEVER_FILES.filter((f) => VARIANTS.some((o, k) => shown(f, o) !== full[k]));
    expect(read).toContain('breakdown');
    expect(DEFERRED_FILES.filter((f) => read.includes(f))).toEqual([]);
  }, 120_000);
});
