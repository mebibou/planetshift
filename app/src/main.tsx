import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { StartError } from './app/StartError';
import { lazy, Suspense } from 'react';
import { stateFromQuery } from './app/shell';
import { applyTheme, effectiveTheme, prefersDark, readStoredTheme } from './app/theme';
import { parseTourFlag, readTourSeen, shouldShowTour } from './app/tour';
import { parseUi } from './app/url';
import { dataFolder, loadAll, LoadError } from './data/load';
import { browserLang, parseLang, readStoredLang, translator } from './i18n/i18n';

/** Shown on a first visit only, so loaded then, in its own file. */
const Tour = lazy(() => import('./ui/Tour').then((m) => ({ default: m.Tour })));

const element = document.getElementById('app');
const lang =
  readStoredLang() ?? parseLang(new URLSearchParams(location.search).get('lang')) ?? browserLang();
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
