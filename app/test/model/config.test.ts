import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEPARTURES, departuresOf } from '../../src/config';
import { plainFair, resolveDepartures, type ConfigSchema } from '../../src/configSchema';
import { MODULES } from '../../src/levers/registry';
import { OPTIONS } from '../../src/model/options';

const root = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '../../..', name), 'utf8'));
const schema = root('planetshift.config.schema.json') as ConfigSchema;
const switches = schema.properties.departures.properties;

describe('planetshift.config.json', () => {
  it('is baked into the build as written, naming every switch', () => {
    const written = (root('planetshift.config.json') as { departures: object }).departures;
    expect(Object.keys(written).sort()).toEqual(Object.keys(switches).sort());
    expect(DEPARTURES).toEqual(written);
    expect(departuresOf({})).toEqual(DEPARTURES);
  });

  it('gives each switch its default and a plain-FaIR value among its values', () => {
    Object.values(switches).forEach((s) => {
      expect(s.enum).toContain(s.default);
      expect(s.enum).toContain(s.plainFair);
    });
    const defaults = Object.fromEntries(Object.entries(switches).map(([k, s]) => [k, s.default]));
    expect(resolveDepartures(schema, {})).toEqual(defaults);
    expect(resolveDepartures(schema, { departures: plainFair(schema) })).toEqual(plainFair(schema));
  });

  it.each([
    { other: 1 },
    { departures: { nothing: 'on' } },
    { departures: { permafrost: 'maybe' } },
    { departures: [] },
  ])('rejects %j', (bad) => expect(() => resolveDepartures(schema, bad)).toThrow());

  it('leaves a module out of the build when its departure is off, and never in the URL', () => {
    MODULES.forEach((m) =>
      expect(m.departure === undefined || DEPARTURES[m.departure] === 'on').toBe(true),
    );
    const keys = OPTIONS.map((o) => o.key);
    Object.keys(switches).forEach((k) => expect(keys).not.toContain(k));
  });
});
