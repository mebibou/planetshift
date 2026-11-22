import type { Loaded } from '../data/load';
import { localeOf, storeLang, translator, type Lang } from '../i18n/i18n';
import { LEVER_IDS } from '../levers/registry';
import {
  DEFAULT_OPTIONS,
  type Levers,
  type Options,
  type Scenario,
  type ScenarioResult,
} from '../model/api';
import { runScenario } from '../model/run';
import { BASE_SCENARIO } from '../model/scenarios';
import { decodeState, encodeState } from '../model/state';
import { methodologyView } from '../methodology/view';
import type { AppState, ViewContext } from './context';
import { h } from './dom';
import { exploreView, type ExploreView } from './explore';
import { header } from './header';
import { createStore } from './store';
import {
  applyTheme,
  effectiveTheme,
  prefersDark,
  readStoredTheme,
  storeTheme,
  toggled,
} from './theme';
import { buildQuery, modelQuery, parseUi, type View } from './url';

/** Every lever in full: what loads every deferred file. */
const ALL_LEVERS: Levers = Object.fromEntries(LEVER_IDS.map((id) => [id, 1]));

/** The model's state from the URL, or the defaults when it has none or cannot read it. */
export const stateFromQuery = (query: string): { scenario: Scenario; options: Options } => {
  try {
    return decodeState(modelQuery(query));
  } catch {
    return { scenario: BASE_SCENARIO, options: DEFAULT_OPTIONS };
  }
};

const queryOf = (s: AppState, current: string): string => {
  let model = '';
  try {
    model = encodeState(s.scenario, s.options);
  } catch {
    model = modelQuery(current);
  }
  return buildQuery(model, s.ui, current);
};

const run = (loaded: Loaded, s: AppState, year: number): ScenarioResult | null => {
  try {
    return runScenario(loaded.data, s.scenario, s.options, year);
  } catch {
    return null;
  }
};

export const startApp = (root: HTMLElement, initial: Loaded, lang: Lang, currentYear: number) => {
  let loaded = initial;
  const query = location.search;
  const store = createStore<AppState>({
    ...stateFromQuery(query),
    ui: parseUi(query),
    lang,
    theme: effectiveTheme(readStoredTheme(), prefersDark()),
  });
  let views: { explore?: ExploreView; methodology?: HTMLElement } = {};
  let result: ScenarioResult | null = null;
  let frame = 0;
  const main = h('main', { id: 'main', tabindex: '-1' });

  const setScenario = (change: (s: Scenario) => Scenario) =>
    store.update((s) => ({ ...s, scenario: change(s.scenario) }));
  const setOptions = (change: (o: Options) => Options) =>
    store.update((s) => ({ ...s, options: change(s.options) }));
  const setUi: ViewContext['setUi'] = (change) => store.update((s) => ({ ...s, ui: change(s.ui) }));

  const context = (s: AppState): ViewContext => ({
    t: translator(s.lang),
    lang: s.lang,
    locale: localeOf(s.lang),
    data: loaded.data,
    latestData: () => loaded.data,
    loadAll: () => completeLevers(ALL_LEVERS),
    world: loaded.world,
    currentYear,
    state: s,
    setScenario,
    setOptions,
    setUi,
  });

  const showView = (s: AppState) => {
    const ctx = context(s);
    const view: View = s.ui.view;
    if (view === 'explore') {
      views.explore ??= exploreView(ctx);
      main.replaceChildren(views.explore.el);
      views.explore.show(result, s);
    } else {
      views.methodology ??= methodologyView(ctx.t, s.lang);
      main.replaceChildren(views.methodology);
    }
  };

  let head = header(translator(lang), lang, {
    go: () => undefined,
    setLang: () => undefined,
    toggleTheme: () => undefined,
  });

  const build = (s: AppState) => {
    const t = translator(s.lang);
    document.documentElement.lang = s.lang;
    document.title = `Planetshift · ${t('header.tagline')}`;
    views = {};
    head = header(t, s.lang, {
      go: (view) => {
        store.update((st) => ({ ...st, ui: { ...st.ui, view } }));
        main.focus({ preventScroll: true });
        window.scrollTo({ top: 0 });
      },
      setLang: (l) => store.update((st) => ({ ...st, lang: l })),
      toggleTheme: () =>
        store.update((st) => {
          const theme = toggled(st.theme);
          storeTheme(theme);
          applyTheme(theme);
          return { ...st, theme };
        }),
    });
    head.set(s.ui.view, s.theme);
    root.replaceChildren(
      h('a', { href: '#main', class: 'skip-link' }, t('header.skip')),
      head.el,
      main,
      h('footer', { class: 'site-footer' }, t('footer.text', { year: loaded.data.meta.baseYear })),
    );
    showView(s);
  };

  const rerun = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const s = store.get();
      completeData(s);
      result = run(loaded, s, currentYear);
      views.explore?.show(result, s);
    });
  };

  /** Loads the deferred files the levers now need, then runs again with them. */
  const completeData = (s: AppState) => completeLevers(s.scenario.levers);
  const completeLevers = (levers: Levers) =>
    loaded
      .complete(levers)
      ?.then((next) => {
        loaded = next;
        rerun();
      })
      .catch(() => undefined);

  const writeUrl = (s: AppState, previous: AppState) => {
    const next = queryOf(s, location.search) || location.pathname;
    const hash = s.ui.view === 'methodology' ? location.hash : '';
    if (s.ui.view !== previous.ui.view) history.pushState(null, '', next + hash);
    else history.replaceState(null, '', next + hash);
  };

  store.subscribe((s, previous) => {
    if (s.lang !== previous.lang) {
      storeLang(s.lang);
      build(s);
    } else if (s.ui.view !== previous.ui.view) {
      head.set(s.ui.view, s.theme);
      showView(s);
    } else {
      head.set(s.ui.view, s.theme);
      views.explore?.sync(s);
    }
    if (s.scenario !== previous.scenario || s.options !== previous.options) rerun();
    else if (s.ui !== previous.ui && s.ui.view === 'explore') views.explore?.show(result, s);
    writeUrl(s, previous);
  });

  window.addEventListener('popstate', () =>
    store.update((s) => ({
      ...s,
      ...stateFromQuery(location.search),
      ui: parseUi(location.search),
    })),
  );
  if (typeof matchMedia === 'function')
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!readStoredTheme()) store.update((s) => ({ ...s, theme: e.matches ? 'dark' : 'light' }));
    });

  applyTheme(readStoredTheme());
  completeData(store.get());
  result = run(loaded, store.get(), currentYear);
  build(store.get());
  views.explore?.sync(store.get());
  history.replaceState(
    null,
    '',
    (queryOf(store.get(), location.search) || location.pathname) + location.hash,
  );
};
