import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AppState, ViewContext } from '../app/context';
import { worldPerCapita } from '../app/summaryModel';
import { tabKeys } from '../app/tabs';
import { CHARTS, type ChartTab, type Horizon } from '../app/url';
import { avoidedChart } from '../chart/avoided';
import { seaLevelChart } from '../chart/seaLevel';
import { causeGasesOf, type CauseGas } from '../chart/series';
import { RANGE_START, temperatureChart, type Range } from '../chart/temperature';
import { dataFolder } from '../data/load';
import type { ModelData } from '../data/types';
import { leverAvailable } from '../levers/registry';
import type { Options } from '../model/api';
import type { RunResult } from '../model/engine';
import { SidePanel } from './Panel';
import { Impacts } from './Impacts';
import { Summary } from './Summary';
import { CARD, LINK_BUTTON, MAP_CARD } from './classes';
import { ChartLoading } from './ChartLoading';
import { Info } from './Info';
import { Segmented } from './Segmented';
import { useChartDownload } from './Download';
import { useDrawn } from './useDrawn';
import { useLatest } from './useLatest';
import { columns } from './columns';
import { useMenu } from './useMenu';
import { useWorth, WorthContext } from './Worth';

/** A counter that goes up each time `data` changes: a deferred lever file arriving. */
const useVersion = (data: unknown): number => {
  const [seen, setSeen] = useState({ data, version: 0 });
  if (seen.data !== data) {
    setSeen({ data, version: seen.version + 1 });
  }
  return seen.data === data ? seen.version : seen.version + 1;
};

export interface ExploreProps {
  ctx: ViewContext;
  state: AppState;
  /** Undefined until the first run is back; null when a run failed. */
  result: RunResult | null | undefined;
  /** The data as loaded so far, a deferred lever file included once it has arrived. */
  data: ModelData;
  failures: number;
}

// Below the fold or behind a tab: loaded once the page has drawn, each in its own file.
const MapCard = lazy(() => import('./MapCard').then((m) => ({ default: m.MapCard })));
const CauseView = lazy(() => import('./CauseView').then((m) => ({ default: m.CauseView })));

/** The temperature chart, with the world population as an area behind its lines. */
const makeTemperature = (ctx: ViewContext) => {
  const chart = temperatureChart(ctx.t, ctx.locale, ctx.currentYear);
  return { el: chart.el, chart };
};

const ChartTabs = ({ ctx, chart }: { ctx: ViewContext; chart: ChartTab }) => {
  const select = (tab: ChartTab) => ctx.setUi((u) => ({ ...u, chart: tab }));
  return (
    <div
      className="chart-tabs flex gap-1 self-end border-b border-rule"
      role="tablist"
      aria-label={ctx.t('charts.title')}
    >
      {CHARTS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`chart-tab-${tab}`}
          className="chart-tab -mb-px cursor-pointer border-0 border-b-3 border-solid border-transparent bg-transparent px-3 py-2 text-[1.05rem] font-bold text-muted aria-selected:border-accent aria-selected:text-ink max-sm:px-2 max-sm:text-[0.92rem]"
          aria-controls={`chart-panel-${tab}`}
          aria-selected={tab === chart}
          tabIndex={tab === chart ? 0 : -1}
          onClick={() => select(tab)}
          onKeyDown={(e: KeyboardEvent) =>
            tabKeys(CHARTS, tab, select, (target) => `chart-tab-${target}`)(e.nativeEvent)
          }
        >
          {ctx.t(`charts.tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
};

interface Draw {
  result: RunResult | null | undefined;
  ui: AppState['ui'];
  options: Options;
  data: ModelData;
  currentYear: number;
}

interface Drawn {
  temperature: ReturnType<typeof makeTemperature>;
  avoided: ReturnType<typeof avoidedChart>;
  sealevel: ReturnType<typeof seaLevelChart>;
}

/** How each chart that a run draws is drawn from it. */
const DRAW: Record<
  Exclude<ChartTab, 'cause'>,
  (d: Drawn, draw: Draw & { result: RunResult }) => void
> = {
  temperature: ({ temperature }, { result, ui, data, options }) => {
    const end = Number(ui.horizon);
    temperature.chart.update(
      result,
      ui.range,
      end,
      data.climate.naturalOnly,
      data.enso,
      options.ssp,
    );
  },
  avoided: ({ avoided }, { result, ui }) => avoided.update(result, Number(ui.horizon)),
  sealevel: ({ sealevel }, { result, ui, data, options }) =>
    sealevel.update(
      result,
      Number(ui.horizon),
      ui.range,
      data.climate.seaLevel?.observed,
      options.ssp,
    ),
};

/** The charts, drawn again from the latest result and choices. */
const useCharts = ({ ctx, state, result, data }: ExploreProps) => {
  const [temperature, temperatureRef] = useDrawn(() => makeTemperature(ctx));
  const [avoided, avoidedRef] = useDrawn(() => avoidedChart(ctx.t, ctx.locale, ctx.currentYear));
  const [sealevel, sealevelRef] = useDrawn(() => seaLevelChart(ctx.t, ctx.locale, ctx.currentYear));
  const { ui, options } = state;
  useEffect(() => {
    const draw = { result, ui, options, data, currentYear: ctx.currentYear };
    if (result && ui.chart !== 'cause') {
      DRAW[ui.chart]({ temperature, avoided, sealevel }, { ...draw, result });
    }
  }, [result, ui, options, data, temperature, avoided, sealevel, ctx.currentYear]);
  return { temperatureRef, avoidedRef, sealevelRef };
};

/** The gas the Causes of warming tab shows: every emission when the build has no split for it. */
const causeGasOf = (ui: AppState['ui'], gases: readonly CauseGas[]): CauseGas =>
  gases.includes(ui.causeGas) ? ui.causeGas : 'all';

/** The switches above the charts, together on one row with the download button. */
const ChartSwitches = (props: {
  ctx: ViewContext;
  ui: AppState['ui'];
  gases: readonly CauseGas[];
  children: ReactNode;
}) => {
  const { ctx, ui, gases } = props;
  const { t } = ctx;
  return (
    <div className="chart-switches mt-3 mb-2 flex flex-wrap items-end gap-x-5 gap-y-3 [&>.download-menu]:ml-auto">
      <Segmented<Range>
        name="range"
        legend={t('chart.range')}
        options={(['full', 'recent'] as const).map((v) => ({
          value: v,
          label: t(
            ui.chart === 'sealevel' && v === 'full'
              ? 'chart.ranges.since1900'
              : `chart.ranges.${v}`,
          ),
        }))}
        value={ui.range}
        hidden={ui.chart === 'avoided'}
        onChange={(r) => ctx.setUi((u) => ({ ...u, range: r }))}
      />
      <Segmented<CauseGas>
        name="causegas"
        legend={t('link.gas')}
        options={gases.map((value) => ({ value, label: t(`link.gasChoices.${value}`) }))}
        value={causeGasOf(ui, gases)}
        hidden={ui.chart !== 'cause' || gases.length < 2}
        info={
          <Info
            label={t('link.whyTitle')}
            text={['intro', 'whyMethane', 'whyNitrous', 'whyCo2', 'whyHfc'].map((k) =>
              t(`link.${k}`),
            )}
          />
        }
        onChange={(g) => ctx.setUi((u) => ({ ...u, causeGas: g }))}
      />
      {props.children}
    </div>
  );
};

const RUN_ERROR = 'run-error m-0 mt-2 font-bold text-danger';

/** The chart card: its tabs, its switches and the chart shown. */
const ChartCard = (props: ExploreProps) => {
  const { ctx, state, result } = props;
  const { t } = ctx;
  const { temperatureRef, avoidedRef, sealevelRef } = useCharts(props);
  const latest = useLatest({ result, state, climate: props.data.climate });
  const download = useChartDownload(t, () => ({
    ...latest.current,
    result: latest.current.result ?? null,
    currentYear: ctx.currentYear,
  }));
  const failed = ctx.failedFiles();
  const { chart, range } = state.ui;
  const gases = causeGasesOf(props.data.climate);
  const causeGas = causeGasOf(state.ui, gases);
  return (
    <section
      className={`${CARD} chart-card max-[640px]:px-3 lg:[grid-area:chart] max-lg:aria-busy:min-h-[1000px]`}
      aria-label={t('charts.title')}
      aria-busy={result === undefined}
    >
      <ChartTabs ctx={ctx} chart={chart} />
      <ChartSwitches ctx={ctx} ui={state.ui} gases={gases}>
        {download.button}
      </ChartSwitches>
      {download.status}
      <div
        role="tabpanel"
        id="chart-panel-temperature"
        aria-labelledby="chart-tab-temperature"
        hidden={chart !== 'temperature'}
      >
        <span className="drawn" ref={temperatureRef} />
        <button
          type="button"
          className={`${LINK_BUTTON} see-causes mt-2`}
          aria-controls="chart-panel-cause"
          onClick={() => ctx.setUi((u) => ({ ...u, chart: 'cause' }))}
        >
          {t('charts.seeCauses')}
        </button>
      </div>
      <div
        role="tabpanel"
        id="chart-panel-avoided"
        aria-labelledby="chart-tab-avoided"
        hidden={chart !== 'avoided'}
      >
        <span className="drawn" ref={avoidedRef} />
      </div>
      <div
        role="tabpanel"
        id="chart-panel-sealevel"
        aria-labelledby="chart-tab-sealevel"
        hidden={chart !== 'sealevel'}
      >
        <span className="drawn" ref={sealevelRef} />
      </div>
      <div
        role="tabpanel"
        id="chart-panel-cause"
        aria-labelledby="chart-tab-cause"
        hidden={chart !== 'cause'}
      >
        {chart === 'cause' && (
          <Suspense
            fallback={
              <div className="cause-view grid gap-2" aria-busy="true">
                <ChartLoading t={t} />
              </div>
            }
          >
            <CauseView
              t={t}
              locale={ctx.locale}
              currentYear={ctx.currentYear}
              result={result ?? null}
              climate={props.data.climate}
              ssp={state.options.ssp}
              temperature={state.options.temperature}
              from={RANGE_START[range]}
              end={Number(state.ui.horizon)}
              gas={causeGas}
            />
          </Suspense>
        )}
      </div>
      <p className={RUN_ERROR} role="alert" hidden={result !== null}>
        {result === null ? t('explore.runError') : ''}
      </p>
      <p className={RUN_ERROR} role="alert" hidden={failed.length === 0}>
        {failed.length
          ? t('explore.fileError', { files: failed.map((f) => `${f}.json`).join(', ') })
          : ''}
      </p>
    </section>
  );
};

/** The Explore view: the charts, the panel of levers beside them, the summary and the map. */
export const Explore = (props: ExploreProps) => {
  const { ctx, state, data } = props;
  const { t, locale } = ctx;
  const values = useWorth(
    (scenario, options) => {
      ctx.loadAll();
      return ctx.model.avoided(scenario, options, ctx.currentYear);
    },
    state.scenario,
    state.options,
    data,
  );
  const dataVersion = useVersion(data);
  const horizon = state.ui.horizon;
  const worth = useMemo(() => ({ values, horizon, t, locale }), [values, horizon, t, locale]);
  const shown = props.result ?? null;
  const [panelOpen, setPanelOpen] = useMenu('panel');
  const [summaryOpen, setSummaryOpen] = useMenu('summary');
  return (
    <WorthContext.Provider value={worth}>
      <div
        className="explore grid grid-cols-[minmax(0,1fr)] items-start gap-x-5 gap-y-4 *:min-w-0 lg:grid-cols-[var(--panel-col)_minmax(0,1fr)] lg:[grid-template-areas:'panel_chart'_'panel_summary'_'panel_impacts'_'panel_map'] xl:grid-cols-[var(--panel-col)_minmax(0,1fr)_var(--summary-col)] xl:[grid-template-areas:'panel_chart_summary'_'panel_impacts_summary'_'panel_map_summary']"
        style={columns({
          panel: [panelOpen, 'minmax(280px,340px)'],
          summary: [summaryOpen, 'minmax(260px,320px)'],
        })}
      >
        <ChartCard {...props} />
        <SidePanel
          t={t}
          locale={locale}
          scenario={state.scenario}
          setScenario={ctx.setScenario}
          options={state.options}
          setOptions={ctx.setOptions}
          horizon={horizon}
          setHorizon={(h: Horizon) => ctx.setUi((u) => ({ ...u, horizon: h }))}
          rampEnd={state.scenario.rampEnd}
          currentYear={ctx.currentYear}
          climate={data.climate}
          values={values}
          dataVersion={dataVersion}
          available={(id) => leverAvailable(data, id)}
          population={data.population}
          open={panelOpen}
          setOpen={setPanelOpen}
        />
        <Summary
          t={t}
          locale={locale}
          currentYear={ctx.currentYear}
          result={shown}
          perCapita={
            shown ? worldPerCapita(shown.countries, data.countries, data.meta.baseYear) : null
          }
          completeYear={state.scenario.rampEnd}
          horizon={horizon}
          options={state.options}
          wild={data.mammals?.wild}
          species={data.species}
          open={summaryOpen}
          setOpen={setSummaryOpen}
        />
        {data.impacts && (
          <Impacts t={t} locale={locale} impacts={data.impacts} result={shown} horizon={horizon} />
        )}
        <Suspense fallback={<section className={MAP_CARD} aria-busy="true" />}>
          <MapCard
            t={t}
            locale={locale}
            lang={ctx.lang}
            world={ctx.world}
            countries={data.countries}
            intensities={data.intensities}
            climate={data.climate}
            meta={data.meta}
            landUse={data.landuse}
            currentYear={ctx.currentYear}
            folder={dataFolder(location.search)}
            files={__DATA_FILES__[dataFolder(location.search)] ?? []}
            result={shown}
            state={state}
            setUi={ctx.setUi}
          />
        </Suspense>
      </div>
    </WorthContext.Provider>
  );
};
