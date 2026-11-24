// The deep-time page's own texts, in its lazy chunk, so the first load of every other view skips them.
import { flatten, lookup, type Params, type Tree } from '../i18n/dict';
import type { Lang, T } from '../i18n/i18n';
import en from './en.json';
import fr from './fr.json';

/** The page's texts by language, under `deeptime.`, as the translator reads them. */
export const PAGE_TEXTS: Record<Lang, Record<string, string>> = {
  en: flatten({ deeptime: en as Tree }),
  fr: flatten({ deeptime: fr as Tree }),
};

/** The app's translator, reading the page's texts first. */
export const withPageTexts =
  (t: T, lang: Lang): T =>
  (key: string, params: Params = {}) =>
    key in PAGE_TEXTS.en ? lookup([PAGE_TEXTS[lang], PAGE_TEXTS.en], key, params) : t(key, params);
