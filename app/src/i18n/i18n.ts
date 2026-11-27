import { attempt } from '../app/attempt';
import en from './en.json';
import fr from './fr.json';
import { flatten, lookup, type Params, type Tree } from './dict';

export type Lang = 'en' | 'fr';
export const LANGS: Lang[] = ['en', 'fr'];

const MODULE_FILES = import.meta.glob('../levers/*/{en,fr}.json', {
  eager: true,
  import: 'default',
}) as Record<string, Tree>;

/** Each lever module's texts in a language (app/src/levers/<id>/<lang>.json), by module id. */
export const moduleTexts = (lang: Lang): Record<string, Tree> =>
  Object.fromEntries(
    Object.entries(MODULE_FILES).flatMap(([path, tree]) => {
      const m = /\/levers\/([\w-]+)\/(\w+)\.json$/.exec(path);
      return m?.[2] === lang ? [[m[1] as string, tree]] : [];
    }),
  );

/** The core dictionary with each module's texts under `levers.<id>`. */
const merged = (core: Tree, lang: Lang): Tree => ({
  ...core,
  levers: { ...(core.levers as Tree), ...moduleTexts(lang) },
});

/** The dictionaries as the interface reads them, flattened to dotted keys. */
export const DICTIONARIES: Record<Lang, Record<string, string>> = {
  en: flatten(merged(en, 'en')),
  fr: flatten(merged(fr, 'fr')),
};
const DICTS = DICTIONARIES;

export const parseLang = (value: string | null | undefined): Lang | null =>
  value === 'en' || value === 'fr' ? value : null;

export const localeOf = (lang: Lang): string => (lang === 'fr' ? 'fr-FR' : 'en-GB');

export const has = (lang: Lang, key: string): boolean => key in DICTS[lang] || key in DICTS.en;

export const translator =
  (lang: Lang) =>
  (key: string, params: Params = {}): string =>
    lookup([DICTS[lang], DICTS.en], key, params);

export type T = ReturnType<typeof translator>;

const KEY = 'planetshift.lang';

export const readStoredLang = (): Lang | null =>
  parseLang(attempt(() => localStorage.getItem(KEY), null));

export const storeLang = (lang: Lang): void => {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // storage unavailable
  }
};

export const browserLang = (): Lang =>
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')
    ? 'fr'
    : 'en';
