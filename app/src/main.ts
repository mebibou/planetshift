import './styles.css';
import { dataFolder, loadAll, LoadError } from './data/load';
import { browserLang, parseLang, readStoredLang, translator } from './i18n/i18n';
import { applyTheme, readStoredTheme } from './app/theme';
import { h } from './app/dom';
import { startApp } from './app/shell';

const root = document.getElementById('app');
const lang =
  readStoredLang() ?? parseLang(new URLSearchParams(location.search).get('lang')) ?? browserLang();
const t = translator(lang);
applyTheme(readStoredTheme());

if (root) {
  root.replaceChildren(h('p', { class: 'loading', role: 'status' }, t('load.loading')));
  loadAll(dataFolder(location.search))
    .then((loaded) => startApp(root, loaded, lang, new Date().getFullYear()))
    .catch((e: unknown) =>
      root.replaceChildren(
        h(
          'div',
          { class: 'load-error', role: 'alert' },
          h('h1', {}, t('load.failedTitle')),
          h('p', {}, t('load.failed', { file: e instanceof LoadError ? e.file : '?' })),
          h('p', {}, t('load.retry')),
        ),
      ),
    );
}
