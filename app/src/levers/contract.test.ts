// The contract every lever module passes, generated over the registry.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACTS_WITH, lever, run } from '../../test/levers';
import { CURRENT_YEAR } from '../../test/model/fixtures';
import { loadRealData } from '../../test/model/realData';
import { flatten, placeholders } from '../i18n/dict';
import { moduleTexts } from '../i18n/i18n';
import { CORE_SECTIONS } from '../methodology/sections';
import { DEFAULT_OPTIONS, type Options, type ScenarioResult } from '../model/api';
import { OPTIONS } from '../model/options';
import { runScenario } from '../model/run';
import { BASE_SCENARIO } from '../model/scenarios';
import { decodeState, encodeState } from '../model/state';
import { FAMILIES, LEVERS, MODULES } from './registry';

const ROOT = join(__dirname, '../../..');
const CORE_KEYS = ['shift', 'rum', 'pig', 'pou', 'dai', 'egg', 'sea', 'basis', 'with', 'where'];
const UI_KEYS = ['ramp', 'view', 'layer', 'change', 'group', 'gas', 'chart', 'to', 'data'];
const TOLERANCE = 1e-12;

const warmings = (r: ScenarioResult) => [
  r.summary.avoidedWarming2050.median,
  r.summary.avoidedWarming2100.median,
];
const optionsWith = (field: string, value: string): Options =>
  ({ ...DEFAULT_OPTIONS, [field]: value }) as Options;

describe('the registry', () => {
  it('gives every lever, option and module its own id and URL key', () => {
    const keys = [...LEVERS.map((l) => l.key), ...OPTIONS.map((o) => o.key)];
    const unique = (xs: readonly string[]) => expect(new Set(xs).size).toBe(xs.length);
    unique([...keys, ...CORE_KEYS, ...UI_KEYS]);
    unique(LEVERS.map((l) => l.id));
    unique(MODULES.map((m) => m.id));
    unique(OPTIONS.map((o) => o.field));
    unique(FAMILIES);
  });
});

describe.each(MODULES.map((m) => [m.id, m] as const))('module %s', (id, module) => {
  const en = flatten(moduleTexts('en')[id] ?? {});
  const fr = flatten(moduleTexts('fr')[id] ?? {});

  it('has its texts in both languages with the same placeholders', () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    Object.keys(en).forEach((k) =>
      expect([k, placeholders(fr[k] ?? '')]).toEqual([k, placeholders(en[k] ?? '')]),
    );
    const own = (key: string) => key.replace(`levers.${id}.`, '');
    const needed = [
      ...(module.levers.length > 0 ? ['title', 'description'] : []),
      ...(module.family ? ['family'] : []),
      ...('page' in module.methodology ? ['page'] : []),
      ...module.levers.flatMap((l) => [own(l.ui.label), own(l.ui.hint)]),
      ...module.options.flatMap((o) => [
        own(`${o.texts}.label`),
        own(`${o.texts}.hint`),
        ...o.values.map((v) => own(`${o.texts}.${v}`)),
      ]),
    ];
    expect(needed.filter((k) => !(k in en))).toEqual([]);
  });

  it('has a Methodology page in both languages, or names the core page that covers it', () => {
    const m = module.methodology;
    if ('page' in m) {
      ['en', 'fr'].forEach((lang) =>
        expect(existsSync(join(ROOT, `docs/methodology/${lang}/${m.page}.md`)), lang).toBe(true),
      );
    } else {
      expect(CORE_SECTIONS).toContain(m.coveredBy);
    }
  });

  it('has a fixture for each data file it reads', () =>
    module.files.forEach((f) =>
      expect(existsSync(join(ROOT, `app/public/fixtures/${f.name}.json`)), f.name).toBe(true),
    ));

  it.each(module.options.map((o) => [o.field, o] as const))(
    'option %s round-trips in the URL and reads an invalid value as its default',
    (field, o) => {
      expect((DEFAULT_OPTIONS as unknown as Record<string, string>)[field]).toBe(o.values[0]);
      o.values.forEach((v) =>
        expect(decodeState(encodeState(BASE_SCENARIO, optionsWith(field, v))).options).toEqual(
          optionsWith(field, v),
        ),
      );
      expect(decodeState(`${o.key}=not-a-value`).options).toEqual(DEFAULT_OPTIONS);
    },
  );

  it.each(module.options.map((o) => [o.field, o] as const))(
    'option %s avoids nothing, at any value, without a shift or a lever',
    (field, o) =>
      o.values.forEach((v) => expect(warmings(run({}, optionsWith(field, v))), v).toEqual([0, 0])),
  );
});

describe.each(LEVERS.map((l) => [l.id, l] as const))('lever %s', (id, def) => {
  it('is a share from 0 to 1, 0 by default', () =>
    expect([def.min, def.max, def.default, def.unit]).toEqual([0, 1, 0, 'share']));

  it('changes nothing at 0', () => {
    const none = run({ shift: 0.3 }, ACTS_WITH[id]);
    const r = lever(id, 0, { shift: 0.3 });
    expect(r.summary).toEqual(none.summary);
    expect(r.countries).toEqual(none.countries);
  });

  it('round-trips in the URL and reads an invalid adoption as none', () => {
    const scenario = { ...BASE_SCENARIO, levers: { [id]: 0.375 } };
    expect(encodeState(scenario, DEFAULT_OPTIONS)).toBe(`${def.key}=37.5`);
    expect(decodeState(encodeState(scenario, DEFAULT_OPTIONS)).scenario).toEqual(scenario);
    ['abc', '150', '-1', '', '0'].forEach((raw) =>
      expect(decodeState(`${def.key}=${raw}`).scenario.levers, raw).toEqual({}),
    );
  });

  it('avoids at least as much warming with more adoption', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((a) => warmings(lever(id, a)));
    steps
      .slice(1)
      .forEach((w, k) =>
        w.forEach((v, h) =>
          expect(v, `${k}`).toBeGreaterThanOrEqual((steps[k]?.[h] ?? 0) - TOLERANCE),
        ),
      );
    expect(steps[4]?.[1]).toBeGreaterThan(0);
  });
});

const real = loadRealData();

describe.skipIf(real === null)('every module on the real data', () => {
  const data = real as NonNullable<typeof real>;
  it.each(LEVERS.map((l) => l.id))(
    '%s avoids at least as much warming with more adoption',
    (id) => {
      const w = [0, 0.5, 1].map((a) =>
        warmings(
          runScenario(
            data,
            { ...BASE_SCENARIO, levers: { [id]: a } },
            { ...DEFAULT_OPTIONS, ...ACTS_WITH[id] },
            CURRENT_YEAR,
          ),
        ),
      );
      w.slice(1).forEach((v, k) =>
        v.forEach((x, h) => expect(x).toBeGreaterThanOrEqual((w[k]?.[h] ?? 0) - TOLERANCE)),
      );
    },
  );
});
