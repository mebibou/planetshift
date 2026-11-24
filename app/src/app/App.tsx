import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Loaded } from '../data/load';
import { localeOf, storeLang, translator, type Lang } from '../i18n/i18n';
import { LEVER_IDS } from '../levers/registry';
import type { Levers, Options, Scenario } from '../model/api';
import type { RunResult } from '../model/engine';
import { modelClient, workerPort, type ModelClient } from '../model/client';
import type { AppState, ViewContext } from './context';
import { Explore } from '../ui/Explore';
import { Header } from './Header';
import { CODE_LICENCE, DATA_LICENCES, REPOSITORY } from './links';
import { useLatest } from '../ui/useLatest';
import { queryOf, stateFromQuery } from './shell';
import { applyTheme, readStoredTheme, storeTheme, toggled } from './theme';
import { parseUi, type UiState, type View } from './url';

const Methodology = lazy(() => import('../methodology/Methodology'));
const DeepTime = lazy(() => import('../deeptime/DeepTime'));

/** Every lever in full: what loads every deferred file. */
const ALL_LEVERS: Levers = Object.fromEntries(LEVER_IDS.map((id) => [id, 1]));

type Change<V> = (change: (v: V) => V) => void;

/** The state's setters, each changing one part of it. */
const useSetters = (setState: Change<AppState>) =>
  useMemo(
    () => ({
      setScenario: ((change) =>
        setState((s) => ({ ...s, scenario: change(s.scenario) }))) as Change<Scenario>,
      setOptions: ((change) =>
        setState((s) => ({ ...s, options: change(s.options) }))) as Change<Options>,
      setUi: ((change) => setState((s) => ({ ...s, ui: change(s.ui) }))) as Change<UiState>,
    }),
    [setState],
  );

/** Writes the state into the URL: a new entry when the view changes, else the same one updated. */
const useUrl = (state: AppState) => {
  const view = useRef<View | null>(null);
  useEffect(() => {
    const next = queryOf(state, location.search) || location.pathname;
    const first = view.current === null;
    const hash = first || state.ui.view === 'methodology' ? location.hash : '';
    if (!first && state.ui.view !== view.current) {
      history.pushState(null, '', next + hash);
    } else {
      history.replaceState(null, '', next + hash);
    }
    view.current = state.ui.view;
  }, [state]);
};

/** Takes the model's state from the URL again when the browser goes back or forward. */
const usePopState = (state: AppState, setState: Change<AppState>, currentYear: number) => {
  const latest = useLatest(state);
  useEffect(() => {
    const onPop = () => {
      if (location.search !== queryOf(latest.current, location.search)) {
        setState((s) => ({
          ...s,
          ...stateFromQuery(location.search, currentYear),
          ui: parseUi(location.search),
        }));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setState, currentYear, latest]);
};

/** Follows the system's theme while the reader has not picked one. */
const useSystemTheme = (setState: Change<AppState>) =>
  useEffect(() => {
    const media =
      typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const onChange = (e: MediaQueryListEvent) => {
      if (!readStoredTheme()) {
        setState((s) => ({ ...s, theme: e.matches ? 'dark' : 'light' }));
      }
    };
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  }, [setState]);

/** Loads the deferred files `levers` need into the latest data; `failed` counts a failure. */
const completer =
  (latest: RefObject<Loaded | null>, loaded: (next: Loaded) => void, failed: () => void) =>
  (levers: Levers) =>
    latest.current?.complete(levers)?.then(loaded).catch(failed);

/**
 * The model in its Worker, the data as loaded so far and the latest result. Deferred lever files
 * load once a lever needs them, and the model runs again with them.
 */
const useModel = (
  initial: Loaded | null,
  scenario: Scenario,
  options: Options,
  currentYear: number,
) => {
  /** The data with the deferred files loaded since, once there are any. */
  const [completed, setLoaded] = useState<Loaded | null>(null);
  const loaded = completed ?? initial;
  const [result, setResult] = useState<RunResult | null | undefined>(undefined);
  const [failures, setFailures] = useState(0);
  const [model] = useState<ModelClient>(() => modelClient(workerPort()));
  const latest = useLatest(loaded);
  const [complete] = useState(() => completer(latest, setLoaded, () => setFailures((n) => n + 1)));
  useEffect(() => {
    model.onResult(setResult);
    return () => model.close();
  }, [model]);
  useEffect(() => {
    if (loaded) {
      complete(scenario.levers);
      model.setData(loaded.data);
      model.run(scenario, options, currentYear);
    }
  }, [model, loaded, scenario, options, currentYear, complete]);
  return { loaded, latestLoaded: latest, result, failures, model, complete };
};

export interface AppProps {
  initial: AppState;
  /** The data, null while it loads: the Methodology needs none of it and shows at once. */
  loaded: Loaded | null;
  currentYear: number;
}

const Loading = ({ t }: { t: (key: string) => string }) => (
  <p className="loading mx-auto my-[15vh] max-w-[60ch] px-(--gutter)" role="status">
    {t('load.loading')}
  </p>
);

interface CurrentViewProps {
  state: AppState;
  ctx: ViewContext | null;
  data: Loaded['data'] | null;
  result: RunResult | null | undefined;
  failures: number;
  t: (key: string) => string;
}

/** The view the state names: Methodology needs no data, the others wait for it. */
const CurrentView = ({ state, ctx, data, result, failures, t }: CurrentViewProps) => {
  const loading = <Loading t={t} />;
  const view = state.ui.view;
  if (view === 'methodology') {
    return (
      <Suspense fallback={loading}>
        <Methodology t={t} lang={state.lang} />
      </Suspense>
    );
  }
  if (!ctx || !data) {
    return loading;
  }
  return view === 'deeptime' ? (
    <Suspense fallback={loading}>
      <DeepTime key={state.lang} ctx={ctx} result={result} />
    </Suspense>
  ) : (
    <Explore
      key={state.lang}
      ctx={ctx}
      state={state}
      result={result}
      data={data}
      failures={failures}
    />
  );
};

export const App = ({ initial, loaded: first, currentYear }: AppProps) => {
  const [state, setState] = useState(initial);
  const { setScenario, setOptions, setUi } = useSetters(setState);
  const { loaded, latestLoaded, result, failures, model, complete } = useModel(
    first,
    state.scenario,
    state.options,
    currentYear,
  );
  const main = useRef<HTMLElement>(null);
  const t = useMemo(() => translator(state.lang), [state.lang]);
  useUrl(state);
  usePopState(state, setState, currentYear);
  useSystemTheme(setState);
  useEffect(() => {
    storeLang(state.lang);
    document.documentElement.lang = state.lang;
    document.title = `Planetshift · ${t('header.tagline')}`;
  }, [state.lang, t]);
  const ready = loaded !== null;
  const ctx = useMemo<ViewContext | null>(
    () =>
      loaded && {
        t,
        lang: state.lang,
        locale: localeOf(state.lang),
        data: loaded.data,
        latestData: () => latestLoaded.current?.data ?? loaded.data,
        loadAll: () => complete(ALL_LEVERS),
        failedFiles: () => latestLoaded.current?.failed() ?? [],
        world: loaded.world,
        model,
        currentYear,
        state,
        setScenario,
        setOptions,
        setUi,
      },
    // A new language builds the view anew, and so does the data's arrival; the state it starts
    // from is the one at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, ready],
  );
  const go = (view: View) => {
    setUi((u) => ({ ...u, view }));
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  };
  const toggleTheme = () =>
    setState((s) => {
      const theme = toggled(s.theme);
      storeTheme(theme);
      applyTheme(theme);
      return { ...s, theme };
    });
  return (
    <>
      <a
        href="#main"
        className="skip-link absolute top-2 -left-[999px] z-10 bg-surface px-3 py-2 focus:left-2"
      >
        {t('header.skip')}
      </a>
      <Header
        t={t}
        lang={state.lang}
        view={state.ui.view}
        theme={state.theme}
        go={go}
        setLang={(lang: Lang) => setState((s) => ({ ...s, lang }))}
        toggleTheme={toggleTheme}
      />
      <main
        id="main"
        className="px-(--gutter) pt-5 pb-10 focus:outline-none"
        tabIndex={-1}
        ref={main}
        data-ready={result === undefined ? undefined : ''}
      >
        <CurrentView
          state={state}
          ctx={ctx}
          data={loaded?.data ?? null}
          result={result}
          failures={failures}
          t={t}
        />
      </main>
      <footer className="site-footer px-(--gutter) pt-4 pb-8 text-[0.85rem] text-muted">
        {loaded && (
          <p className="max-w-[110ch]">{t('footer.text', { year: loaded.data.meta.baseYear })}</p>
        )}
        <p className="footer-links flex max-w-[110ch] flex-wrap gap-x-4 gap-y-1 [&_a]:text-inherit">
          <span>{t('footer.copyright', { year: currentYear })}</span>
          <a href={CODE_LICENCE}>{t('footer.code')}</a>
          <a href={DATA_LICENCES}>{t('footer.data')}</a>
          <a href={REPOSITORY}>{t('footer.source')}</a>
          {/* The deep-time prototype is linked from here only, not from the navigation. */}
          <a
            href="?view=deeptime"
            data-view="deeptime"
            aria-current={state.ui.view === 'deeptime' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              go('deeptime');
            }}
          >
            {t('nav.deeptime')}
          </a>
        </p>
      </footer>
    </>
  );
};
