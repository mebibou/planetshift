import { parseLang, type Lang } from '../i18n/i18n';
import { attempt } from './attempt';
import { VIEWS, type View } from './url';

/**
 * What a pre-rendered page says about itself (`<meta name="planetshift:entry">`): the view it
 * shows, its language (none on the root page, where the reader's own choice comes first), and the
 * way back to the site's root, where the app keeps its URL.
 */
export interface Entry {
  view: View;
  lang?: Lang;
  root: string;
}

const isEntry = (e: Partial<Entry> | null): e is Entry =>
  e !== null &&
  (e.lang === undefined || parseLang(e.lang) !== null) &&
  VIEWS.includes(e.view as View) &&
  typeof e.root === 'string';

/** The entry a page's meta holds, or null on the plain page or when it cannot be read. */
export const parseEntry = (content: string | null | undefined): Entry | null => {
  const e = attempt(() => JSON.parse(content ?? '') as Partial<Entry> | null, null);
  return isEntry(e) ? { view: e.view, root: e.root, ...(e.lang ? { lang: e.lang } : {}) } : null;
};

export const siteRoot = (content: string | null | undefined, href: string): string =>
  new URL(parseEntry(content)?.root ?? './', href).href;

/** Read before main.tsx moves the URL to the root, so no entry page's path reaches a data URL. */
export const SITE_ROOT =
  typeof document === 'undefined'
    ? './'
    : siteRoot(
        document.querySelector('meta[name="planetshift:entry"]')?.getAttribute('content'),
        location.href,
      );

/** The query with the entry's view added when the query names none. */
export const withEntryView = (search: string, entry: Entry | null): string => {
  const params = new URLSearchParams(search);
  if (entry && !params.has('view') && entry.view !== 'explore') {
    params.set('view', entry.view);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};
