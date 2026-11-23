import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { StartError } from './app/StartError';
import { lazy, Suspense } from 'react';
import { stateFromQuery } from './app/shell';
import { applyTheme, effectiveTheme, prefersDark, readStoredTheme } from './app/theme';
import { parseTourFlag, readTourSeen, shouldShowTour } from './app/tour';
import { parseUi } from './app/url';
import { parseEntry, withEntryView } from './app/entry';
import { dataFolder, loadAll, LoadError } from './data/load';
import { browserLang, parseLang, readStoredLang, translator } from './i18n/i18n';

/** Shown on a first visit only, so loaded then, in its own file. */
const Tour = lazy(() => import('./ui/Tour').then((m) => ({ default: m.Tour })));

/**
 * A pre-rendered page (`/methodology/`, `/fr/`…) shows a view in a language; the app takes them
 * from it, then moves its URL back to the site's root, where it keeps its state in the query,
 * before the data is fetched relative to it.
 */
const entry = parseEntry(
  document.querySelector('meta[name="planetshift:entry"]')?.getAttribute('content'),
);
if (entry)
  history.replaceState(
    null,
    '',
    new URL(entry.root, location.href).pathname +
      withEntryView(location.search, entry) +
      location.hash,
  );

const element = document.getElementById('app');
/** The pre-rendered page stays on screen until the app has drawn its own. */
const prerendered = (element?.childElementCount ?? 0) > 0;
// A link's language (a search engine's French page) comes first, then the reader's last choice.
const lang =
  parseLang(new URLSearchParams(location.search).get('lang')) ??
  entry?.lang ??
  readStoredLang() ??
  browserLang();
const t = translator(lang);
const tour = shouldShowTour(
  parseTourFlag(location.search),
  readTourSeen(),
  parseUi(location.search).view,
);
applyTheme(readStoredTheme());

const reasonOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const Failure = ({ title, lines }: { title: string; lines: string[] }) => (
  <div className="load-error" role="alert">
    <h1>{title}</h1>
    {lines.map((line) => (
      <p key={line}>{line}</p>
    ))}
  </div>
);

if (element) {
  const root = createRoot(element);
  const currentYear = new Date().getFullYear();
  if (!prerendered)
    root.render(
      <p className="loading" role="status">
        {t('load.loading')}
      </p>,
    );
  loadAll(dataFolder(location.search)).then(
    (loaded) => {
      try {
        const initial = {
          ...stateFromQuery(location.search, currentYear),
          ui: parseUi(location.search),
          lang,
          theme: effectiveTheme(readStoredTheme(), prefersDark()),
        };
        root.render(
          <StartError
            fallback={(e) => (
              <Failure
                title={t('load.startTitle')}
                lines={[t('load.startFailed', { reason: reasonOf(e) })]}
              />
            )}
          >
            <App initial={initial} loaded={loaded} currentYear={currentYear} />
            {tour && (
              <Suspense fallback={null}>
                <Tour t={t} />
              </Suspense>
            )}
          </StartError>,
        );
      } catch (e) {
        console.error(e);
        root.render(
          <Failure
            title={t('load.startTitle')}
            lines={[t('load.startFailed', { reason: reasonOf(e) })]}
          />,
        );
      }
    },
    (e: unknown) =>
      root.render(
        <Failure
          title={t('load.failedTitle')}
          lines={[
            e instanceof LoadError
              ? t('load.failed', { file: e.file, reason: e.reason })
              : t('load.failedOther', { reason: reasonOf(e) }),
            t('load.retry'),
          ]}
        />,
      ),
  );
}
