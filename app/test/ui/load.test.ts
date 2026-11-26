import { describe, expect, it } from 'vitest';
import {
  DATA_FILES,
  dataFolder,
  dataUrl,
  decodeIntensities,
  DEFERRED_FILES,
  EMPTY_LEVER_DATA,
  LEVER_FILES,
  loadAll,
  LoadError,
  neededFiles,
  OPTIONAL_FILES,
} from '../../src/data/load';

const INTENSITIES = {
  sources: ['https://a', 'https://b'],
  byCountry: {
    FRA: { '2731': { farmGate: { kgPerTonne: { co2: 1, ch4: 2, n2o: 3 }, tier: 1, source: 1 } } },
  },
};
const ok = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const notFound = () =>
  Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
const bodyOf = (url: string) => (url.endsWith('intensities.json') ? INTENSITIES : { url });
const EAGER = LEVER_FILES.filter((f) => !DEFERRED_FILES.includes(f));

describe('data loading', () => {
  it('reads fixtures only when asked', () => {
    expect(dataFolder('?data=fixtures')).toBe('fixtures/');
    expect(dataFolder('?data=other')).toBe('data/');
    expect(dataFolder('')).toBe('data/');
  });

  it('reads the data under the site root, whatever page it is opened from', () => {
    expect(dataUrl('data/', 'https://planetshift.org/')).toBe('https://planetshift.org/data/');
    expect(dataUrl('fixtures/', 'http://localhost:5173/')).toBe('http://localhost:5173/fixtures/');
    expect(dataUrl('data/', './')).toBe('data/');
  });

  it('loads every file from the folder but the deferred ones', async () => {
    const asked: string[] = [];
    const loaded = await loadAll('fixtures/', (url) => {
      asked.push(url);
      return ok(bodyOf(url));
    });
    expect(DEFERRED_FILES).toEqual(['breakdown']);
    expect(asked.sort()).toEqual(
      [...DATA_FILES, ...EAGER, ...OPTIONAL_FILES].map((f) => `fixtures/${f}.json`).sort(),
    );
    expect(loaded.data.meta).toEqual({ url: 'fixtures/meta.json' });
    expect(loaded.data.practices).toEqual({ url: 'fixtures/practices.json' });
    expect(loaded.data.breakdown).toEqual(EMPTY_LEVER_DATA.breakdown);
    expect(loaded.pending).toEqual(['breakdown']);
    expect(loaded.world).toEqual({ url: 'fixtures/world.topo.json' });
  });

  it('gives each intensity its source URL', async () => {
    const loaded = await loadAll('data/', (url) => ok(bodyOf(url)));
    expect(loaded.data.intensities.byCountry['FRA']?.['2731']?.farmGate).toEqual({
      kgPerTonne: { co2: 1, ch4: 2, n2o: 3 },
      tier: 1,
      source: 'https://b',
    });
    expect(decodeIntensities({ sources: [], byCountry: {} })).toEqual({ byCountry: {} });
  });

  it('refuses intensities without their table of sources', async () => {
    await expect(
      loadAll('data/', (url) => ok(url.endsWith('intensities.json') ? { byCountry: {} } : {})),
    ).rejects.toMatchObject({ file: 'data/intensities.json', reason: 'not the expected shape' });
  });

  it('loads a deferred file once a lever of its module is above 0, and only once', async () => {
    const asked: string[] = [];
    const loaded = await loadAll('data/', (url) => {
      asked.push(url);
      return ok(bodyOf(url));
    });
    expect(loaded.complete({})).toBeNull();
    expect(loaded.complete({ feedAdditives: 0 })).toBeNull();
    expect(neededFiles(loaded.pending, { coverCrops: 1 })).toEqual([]);
    const [a, b] = [loaded.complete({ feedAdditives: 0.4 }), loaded.complete({ riceWater: 1 })];
    const next = (await a) ?? expect.fail('not loaded');
    const other = (await b) ?? expect.fail('not loaded');
    expect(other.data).toEqual(next.data);
    expect(asked.filter((u) => u.endsWith('breakdown.json'))).toEqual(['data/breakdown.json']);
    expect(next.data.breakdown).toEqual({ url: 'data/breakdown.json' });
    expect(next.data.meta).toBe(loaded.data.meta);
    expect(next.pending).toEqual([]);
    expect(next.complete({ feedAdditives: 1 })).toBeNull();
  });

  it('names a deferred file that failed and does not ask for it again, and leaves a missing one empty', async () => {
    const asked: string[] = [];
    const loaded = await loadAll('data/', (url) => {
      asked.push(url);
      return url.endsWith('breakdown.json') ? Promise.reject(new TypeError('x')) : ok(bodyOf(url));
    });
    expect(loaded.failed()).toEqual([]);
    await expect(loaded.complete({ feedAdditives: 1 })).rejects.toBeInstanceOf(LoadError);
    expect(loaded.failed()).toEqual(['breakdown']);
    expect(loaded.complete({ feedAdditives: 1 })).toBeNull();
    expect(asked.filter((u) => u.endsWith('breakdown.json'))).toHaveLength(1);
    const missing = await loadAll('data/', (url) =>
      url.endsWith('breakdown.json') ? notFound() : ok(bodyOf(url)),
    );
    expect((await missing.complete({ feedAdditives: 1 }))?.data.breakdown).toEqual(
      EMPTY_LEVER_DATA.breakdown,
    );
  });

  it('names the file that failed', async () => {
    const result = loadAll('data/', (url) =>
      url.endsWith('climate.json') ? notFound() : ok(bodyOf(url)),
    );
    await expect(result).rejects.toBeInstanceOf(LoadError);
    await expect(result).rejects.toMatchObject({ file: 'data/climate.json', reason: 'HTTP 404' });
  });

  it('leaves a lever without effect when its file is missing', async () => {
    const loaded = await loadAll('data/', (url) =>
      url.endsWith('removals.json') ? notFound() : ok(bodyOf(url)),
    );
    expect(loaded.data.removals).toEqual(EMPTY_LEVER_DATA.removals);
  });

  it('opens without an optional core file', async () => {
    const loaded = await loadAll('data/', (url) =>
      url.endsWith('enso.json') ? notFound() : ok(bodyOf(url)),
    );
    expect(loaded.data.enso).toBeUndefined();
    const present = await loadAll('data/', (url) => ok(bodyOf(url)));
    expect(present.data.enso).toEqual({ url: 'data/enso.json' });
  });

  it('reports a network failure and bad JSON', async () => {
    await expect(loadAll('data/', () => Promise.reject(new TypeError('x')))).rejects.toMatchObject({
      reason: 'TypeError',
    });
    await expect(
      loadAll('data/', () =>
        Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError()) }),
      ),
    ).rejects.toMatchObject({ reason: 'not valid JSON' });
  });
});
