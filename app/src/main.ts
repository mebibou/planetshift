import './styles.css';
import { dataFolder, loadAll, LoadError } from './data/load';
import { browserLang, parseLang, readStoredLang, translator } from './i18n/i18n';
import { applyTheme, readStoredTheme } from './app/theme';
import { h } from './app/dom';
import { startApp } from './app/shell';
import { openTour, parseTourFlag, readTourSeen, shouldShowTour } from './app/tour';
import { parseUi } from './app/url';

const root = document.getElementById('app');
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

const failure = (el: HTMLElement, title: string, ...lines: string[]) =>
  el.replaceChildren(
    h(
      'div',
      { class: 'load-error', role: 'alert' },
      h('h1', {}, title),
      ...lines.map((line) => h('p', {}, line)),
    ),
  );

if (root) {
  root.replaceChildren(h('p', { class: 'loading', role: 'status' }, t('load.loading')));
  loadAll(dataFolder(location.search)).then(
    (loaded) => {
      try {
        startApp(root, loaded, lang, new Date().getFullYear());
        if (tour) openTour(t);
      } catch (e) {
        console.error(e);
        failure(root, t('load.startTitle'), t('load.startFailed', { reason: reasonOf(e) }));
      }
    },
    (e: unknown) =>
      failure(
        root,
        t('load.failedTitle'),
        e instanceof LoadError
          ? t('load.failed', { file: e.file, reason: e.reason })
          : t('load.failedOther', { reason: reasonOf(e) }),
        t('load.retry'),
      ),
  );
}
