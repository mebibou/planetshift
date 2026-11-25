import type { Topology } from 'topojson-specification';
import { adoptionOf, LEVER_FILES as MODULE_FILES } from '../levers/registry';
import type { Levers } from '../model/api';
import type { Intensities, IntensitiesFile, ModelData } from './types';

export const DATA_FILES = [
  'meta',
  'countries',
  'items',
  'supply',
  'intensities',
  'feed',
  'land',
  'climate',
  'world.topo',
] as const;
export type DataFile = (typeof DATA_FILES)[number];

/** Core files the page opens without: a missing one (HTTP 404) is left undefined. */
export const OPTIONAL_FILES = [
  'enso',
  'landuse',
  'impacts',
  'mammals',
  'species',
  'chain',
] as const;

/**
 * The lever modules' files. A missing one (HTTP 404) only leaves its levers without effect, so a
 * build made before the pipeline writes it still opens. A deferred one is loaded once one of its
 * module's levers is above 0, by `Loaded.complete`.
 */
export const LEVER_FILES: readonly string[] = MODULE_FILES.map((f) => f.name);
export const DEFERRED_FILES: readonly string[] = MODULE_FILES.filter((f) => f.deferred).map(
  (f) => f.name,
);

/** What each lever file holds when it is missing: nothing for any lever to act on. */
export const EMPTY_LEVER_DATA: Readonly<Record<string, unknown>> = Object.fromEntries(
  MODULE_FILES.map((f) => [f.name, f.empty]),
);

const LEVERS_OF = new Map(MODULE_FILES.map((f) => [f.name, f.levers]));

/** The deferred files among `pending` that a lever above 0 needs. */
export const neededFiles = (pending: readonly string[], levers: Levers): string[] =>
  pending.filter((f) => (LEVERS_OF.get(f) ?? []).some((id) => adoptionOf(levers, id) > 0));

export interface Loaded {
  data: ModelData;
  world: Topology;
  /** The deferred files not loaded yet; their empty values stand in `data`. */
  pending: readonly string[];
  /**
   * Loads the pending files the levers need and resolves with the data holding them; null when
   * they need none, or only files that failed.
   */
  complete: (levers: Levers) => Promise<Loaded> | null;
  /** The deferred files that failed to load: they are not asked for again. */
  failed: () => readonly string[];
}

/** intensities.json as the model reads it: each cell's source index replaced by its URL. */
export const decodeIntensities = (file: IntensitiesFile): Intensities => ({
  ...(file.oilcake ? { oilcake: file.oilcake } : {}),
  ...(file.nonFood ? { nonFood: file.nonFood } : {}),
  byCountry: Object.fromEntries(
    Object.entries(file.byCountry).map(([iso3, items]) => [
      iso3,
      Object.fromEntries(
        Object.entries(items).map(([code, scopes]) => [
          code,
          Object.fromEntries(
            Object.entries(scopes).map(([scope, cell]) => [
              scope,
              { ...cell, source: file.sources[cell.source] ?? '' },
            ]),
          ),
        ]),
      ),
    ]),
  ),
});

export class LoadError extends Error {
  constructor(
    readonly file: string,
    readonly reason: string,
  ) {
    super(`${file}: ${reason}`);
    this.name = 'LoadError';
  }
}

/** `fixtures/` when the page is opened with ?data=fixtures, `data/` otherwise. */
export const dataFolder = (query: string): string =>
  new URLSearchParams(query).get('data') === 'fixtures' ? 'fixtures/' : 'data/';

type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

const MISSING = Symbol('missing');

const loadFile = async (fetchFn: Fetch, url: string, optional = false): Promise<unknown> => {
  const response = await fetchFn(url).catch((e: unknown) => {
    throw new LoadError(url, e instanceof Error ? e.name : 'network error');
  });
  const missing = optional && response.status === 404;
  if (!response.ok && !missing) {
    throw new LoadError(url, `HTTP ${response.status}`);
  }
  return missing
    ? MISSING
    : response.json().catch(() => {
        throw new LoadError(url, 'not valid JSON');
      });
};

const isIntensitiesFile = (body: unknown): body is IntensitiesFile =>
  typeof body === 'object' &&
  body !== null &&
  Array.isArray((body as IntensitiesFile).sources) &&
  typeof (body as IntensitiesFile).byCountry === 'object';

const intensitiesOf = (url: string, body: unknown): Intensities => {
  if (!isIntensitiesFile(body)) {
    throw new LoadError(url, 'not the expected shape');
  }
  return decodeIntensities(body);
};

const leverData = (names: readonly string[], bodies: readonly unknown[]) =>
  Object.fromEntries(
    names.map((f, i) => [f, bodies[i] === MISSING ? EMPTY_LEVER_DATA[f] : bodies[i]]),
  );

/**
 * Loads every data file in parallel but the deferred ones, which `complete` loads when a lever
 * needs them. A deferred file that fails to load is not tried again, as `complete` runs before
 * every model run.
 */
export const loadAll = async (folder: string, fetchFn: Fetch = fetch): Promise<Loaded> => {
  const urlOf = (f: string) => `${folder}${f}.json`;
  const eager = LEVER_FILES.filter((f) => !DEFERRED_FILES.includes(f));
  const [files, leverFiles, optionalFiles] = await Promise.all([
    Promise.all(DATA_FILES.map((f) => loadFile(fetchFn, urlOf(f)))),
    Promise.all(eager.map((f) => loadFile(fetchFn, urlOf(f), true))),
    Promise.all(OPTIONAL_FILES.map((f) => loadFile(fetchFn, urlOf(f), true))),
  ]);
  const byName = Object.fromEntries(DATA_FILES.map((f, i) => [f, files[i]])) as Record<
    DataFile,
    unknown
  >;

  const inFlight = new Map<string, Promise<unknown>>();
  const failed = new Set<string>();
  const fetchOnce = (f: string): Promise<unknown> => {
    if (!inFlight.has(f)) {
      inFlight.set(
        f,
        loadFile(fetchFn, urlOf(f), true).catch((e: unknown) => {
          failed.add(f);
          throw e;
        }),
      );
    }
    return inFlight.get(f) as Promise<unknown>;
  };

  const loaded = (data: ModelData, pending: readonly string[]): Loaded => ({
    data,
    world: byName['world.topo'] as Topology,
    pending,
    complete: (levers) => {
      const needed = neededFiles(pending, levers).filter((f) => !failed.has(f));
      return needed.length === 0
        ? null
        : Promise.all(needed.map(fetchOnce)).then((bodies) =>
            loaded(
              { ...data, ...leverData(needed, bodies) },
              pending.filter((f) => !needed.includes(f)),
            ),
          );
    },
    failed: () => [...failed],
  });

  return loaded(
    {
      meta: byName.meta,
      countries: byName.countries,
      items: byName.items,
      supply: byName.supply,
      intensities: intensitiesOf(urlOf('intensities'), byName.intensities),
      feed: byName.feed,
      climate: byName.climate,
      land: byName.land,
      ...Object.fromEntries(
        OPTIONAL_FILES.flatMap((f, i) =>
          optionalFiles[i] === MISSING ? [] : [[f, optionalFiles[i]]],
        ),
      ),
      ...Object.fromEntries(DEFERRED_FILES.map((f) => [f, EMPTY_LEVER_DATA[f]])),
      ...leverData(eager, leverFiles),
    } as ModelData,
    DEFERRED_FILES,
  );
};
