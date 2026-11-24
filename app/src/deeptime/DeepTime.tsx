import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewContext } from '../app/context';
import { dataFolder } from '../data/load';
import { formatNumber, formatSignificant, formatTemperature } from '../i18n/format';
import type { RunResult } from '../model/engine';
import { deepTimeChart, type ChartTexts, type DeepTimeChart } from './chart';
import { EVENTS } from './events';
import {
  markerView,
  PRESET_VIEWS,
  PRESETS,
  sameView,
  yearAt,
  type Preset,
  type View,
} from './scale';
import {
  PALEO_IDS,
  paleoLines,
  ratesOf,
  recentLines,
  tableOf,
  warmingIn2100,
  type DeepTimeFile,
  type Line,
  type Point,
} from './series';
import { withPageTexts } from './texts';
import './deeptime.css';

type Loaded = DeepTimeFile | 'loading' | 'failed';

const useDeepTimeFile = (): Loaded => {
  const [file, setFile] = useState<Loaded>('loading');
  useEffect(() => {
    let live = true;
    fetch(`${dataFolder(location.search)}deeptime.json`)
      .then((r) => (r.ok ? (r.json() as Promise<DeepTimeFile>) : Promise.reject(r.status)))
      .then((f) => live && setFile(f))
      .catch(() => live && setFile('failed'));
    return () => {
      live = false;
    };
  }, []);
  return file;
};

/**
 * A year as the reader says it: millions or thousands of years ago, or a calendar year, with the
 * digits a window `span` years wide needs to tell its two ends apart.
 */
const describeYear = (ctx: ViewContext, year: number, span: number): string => {
  const ago = ctx.currentYear - year;
  const { t, locale } = ctx;
  const digits = Math.min(9, Math.max(3, Math.ceil(Math.log10(Math.abs(ago) / span)) + 2));
  return ago >= 1e6
    ? t('deeptime.ago.myr', { n: formatSignificant(locale, ago / 1e6, digits) })
    : ago >= 1e4
      ? t('deeptime.ago.kyr', { n: formatSignificant(locale, ago / 1e3, digits) })
      : calendarYear(ctx, Math.round(year));
};

/** A value, with its 5–95% range where the series has one. */
const valueText = ({ t, locale }: ViewContext, p: Point): string =>
  p.lo === undefined || p.hi === undefined
    ? t('deeptime.hover.value', { value: formatNumber(locale, p.mid, 1) })
    : t('deeptime.hover.range', {
        value: formatNumber(locale, p.mid, 1),
        lo: formatNumber(locale, p.lo, 1),
        hi: formatNumber(locale, p.hi, 1),
      });

const calendarYear = (ctx: ViewContext, year: number): string =>
  year < 0 ? ctx.t('deeptime.bce', { year: String(-year) }) : String(year);

const chartTexts = (ctx: ViewContext): ChartTexts => {
  const { t, locale } = ctx;
  return {
    label: (v) =>
      t('deeptime.chartLabel', {
        from: describeYear(ctx, v.start, v.end - v.start),
        to: describeYear(ctx, v.end, v.end - v.start),
      }),
    axis: {
      myr: t('deeptime.axis.myr'),
      kyr: t('deeptime.axis.kyr'),
      year: t('deeptime.axis.year'),
    },
    yAxis: t('deeptime.yAxis'),
    tick: (tick, unit) =>
      unit === 'year' ? calendarYear(ctx, tick.value) : formatNumber(locale, tick.value, 1),
    formatY: (v) => formatNumber(locale, v, 1),
    event: (id) => t(`deeptime.events.${id}.short`),
    paris: (level) => t('deeptime.paris', { level: formatNumber(locale, level, 1) }),
    end: (which, value) =>
      t(`deeptime.end.${which}`, { value: formatTemperature(locale, value, 1) }),
    keys: t('deeptime.keys'),
    hoverYear: (year, span) => describeYear(ctx, year, span),
    series: (id) => t(`deeptime.series.${id}`),
    value: (p) => valueText(ctx, p),
  };
};

/** The chart, made once the data is there and kept; redrawn when the lines change. */
const useChart = (
  ctx: ViewContext,
  lines: Line[] | null,
  end: { baseline: number; scenario: number } | null,
  onView: (v: View) => void,
) => {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<DeepTimeChart | null>(null);
  const ready = lines !== null;
  useEffect(() => {
    if (!host.current || !ready) {
      return;
    }
    chart.current = deepTimeChart(
      host.current,
      chartTexts(ctx),
      PRESET_VIEWS.glacial,
      ctx.currentYear,
      onView,
    );
    return () => {
      chart.current?.destroy();
      chart.current = null;
    };
    // The chart is made once; the texts change only with the language, which remounts the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => {
    if (lines) {
      chart.current?.draw(lines, end);
    }
  }, [lines, end]);
  return { host, chart };
};

const Presets = ({
  ctx,
  view,
  go,
}: {
  ctx: ViewContext;
  view: View | null;
  go: (p: Preset) => void;
}) => (
  <div className="deeptime-presets" role="group" aria-label={ctx.t('deeptime.presets')}>
    {PRESETS.map((p) => (
      <button
        key={p}
        type="button"
        data-preset={p}
        aria-pressed={view !== null && sameView(view, PRESET_VIEWS[p])}
        onClick={() => go(p)}
      >
        {ctx.t(`deeptime.preset.${p}`)}
      </button>
    ))}
  </div>
);

const Steps = ({ ctx, chart }: { ctx: ViewContext; chart: DeepTimeChart | null }) => {
  const steps: [string, () => void][] = [
    ['panLeft', () => chart?.pan(0.2)],
    ['zoomIn', () => chart?.zoom(0.5)],
    ['zoomOut', () => chart?.zoom(2)],
    ['panRight', () => chart?.pan(-0.2)],
  ];
  return (
    <div className="deeptime-steps" role="group" aria-label={ctx.t('deeptime.move')}>
      {steps.map(([id, act]) => (
        <button
          key={id}
          type="button"
          data-step={id}
          aria-label={ctx.t(`deeptime.${id}`)}
          onClick={act}
        >
          <span aria-hidden="true">{ctx.t(`deeptime.${id}Icon`)}</span>
        </button>
      ))}
    </div>
  );
};

const LEGEND: Line['id'][] = [...PALEO_IDS, 'observed', 'baseline', 'scenario'];

const Legend = ({ ctx }: { ctx: ViewContext }) => (
  <ul className="chart-legend deeptime-legend">
    {LEGEND.map((id) => (
      <li key={id}>
        <span className={`key deeptime-key-${id}`} />
        {ctx.t(`deeptime.series.${id}`)}
      </li>
    ))}
  </ul>
);

const ScenarioEnd = ({
  ctx,
  end,
}: {
  ctx: ViewContext;
  end: { baseline: number; scenario: number } | null;
}) => {
  const { t, locale } = ctx;
  const ssp = t(`options.ssp.${ctx.state.options.ssp}`);
  const same = end !== null && Math.abs(end.baseline - end.scenario) < 0.05;
  return (
    <section className="card deeptime-scenario" aria-labelledby="deeptime-scenario">
      <h2 id="deeptime-scenario">{t('deeptime.scenario.title')}</h2>
      {end === null ? (
        <p>{t('load.loading')}</p>
      ) : (
        <p>
          {same
            ? t('deeptime.scenario.none', {
                ssp,
                value: formatTemperature(locale, end.baseline, 1),
              })
            : t('deeptime.scenario.text', {
                ssp,
                without: formatTemperature(locale, end.baseline, 1),
                with: formatTemperature(locale, end.scenario, 1),
              })}
        </p>
      )}
      <p className="card-text">{t('deeptime.scenario.scale')}</p>
    </section>
  );
};

const Rates = ({ ctx, file, lines }: { ctx: ViewContext; file: DeepTimeFile; lines: Line[] }) => {
  const { t, locale } = ctx;
  const rates = ratesOf(file, lines, ctx.currentYear);
  const today = rates.find((r) => r.id === 'observed')!.perCentury;
  const top = Math.max(...rates.map((r) => r.perCentury));
  return (
    <section className="card deeptime-rates" aria-labelledby="deeptime-rates">
      <h2 id="deeptime-rates">{t('deeptime.rates.title')}</h2>
      <ul>
        {rates.map((r) => (
          <li key={r.id} data-rate={r.id}>
            <span className="deeptime-rate-label">
              {t(`deeptime.rates.${r.id}`, { from: ctx.currentYear })}
            </span>
            <span className="deeptime-rate-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(0.5, (100 * r.perCentury) / top)}%` }} />
            </span>
            <span className="deeptime-rate-value">
              {t('deeptime.rates.value', { value: formatSignificant(locale, r.perCentury, 2) })}
              {r.id !== 'observed' && r.id !== 'projected' && r.perCentury > 0
                ? ` · ${t('deeptime.rates.slower', { times: formatSignificant(locale, today / r.perCentury, 2) })}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="card-text">{t('deeptime.rates.note')}</p>
    </section>
  );
};

/** Lights the marker hovered or focused in the panel on the chart, again after each redraw. */
const useActiveMarker = (host: React.RefObject<HTMLDivElement | null>, view: View | null) => {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    host.current?.querySelectorAll<SVGGElement>('[data-event]').forEach((g) => {
      g.classList.toggle('is-active', g.dataset.event === active);
    });
  }, [host, active, view]);
  return setActive;
};

/** The markers beside the chart: each one zooms the chart to it and lights its line. */
const Markers = ({
  ctx,
  view,
  go,
  light,
}: {
  ctx: ViewContext;
  view: View | null;
  go: (v: View) => void;
  light: (id: string | null) => void;
}) => (
  <aside className="card deeptime-markers" aria-labelledby="deeptime-markers">
    <h2 id="deeptime-markers">{ctx.t('deeptime.eventsTitle')}</h2>
    <p className="card-text">{ctx.t('deeptime.markersHint')}</p>
    <ol>
      {EVENTS.map((e) => (
        <li
          key={e.id}
          className={`deeptime-event-${e.kind}`}
          data-outside={view && (e.year < view.start || e.year > view.end) ? '' : undefined}
        >
          <button
            type="button"
            onClick={() => go(markerView(e.year))}
            onMouseEnter={() => light(e.id)}
            onMouseLeave={() => light(null)}
            onFocus={() => light(e.id)}
            onBlur={() => light(null)}
          >
            <span className="deeptime-marker-name">{ctx.t(`deeptime.events.${e.id}.short`)}</span>
            <span className="deeptime-marker-note">{ctx.t(`deeptime.events.${e.id}.note`)}</span>
          </button>
        </li>
      ))}
    </ol>
    <p className="card-text">{ctx.t('deeptime.extinctions')}</p>
  </aside>
);

const Offsets = ({ ctx, file }: { ctx: ViewContext; file: DeepTimeFile }) => (
  <section className="card deeptime-offsets" aria-labelledby="deeptime-offsets">
    <h2 id="deeptime-offsets">{ctx.t('deeptime.offsets.title')}</h2>
    <ul>
      {PALEO_IDS.map((id) => (
        <li key={id} data-offset={id}>
          {ctx.t(`deeptime.offsets.${id}`, {
            offset: formatNumber(ctx.locale, file.offsets[id], 2),
          })}
        </li>
      ))}
      <li>{ctx.t('deeptime.offsets.recent')}</li>
    </ul>
    <p className="card-text">{ctx.t('deeptime.offsets.disagree')}</p>
    <p className="card-text">{ctx.t('deeptime.offsets.resolution')}</p>
  </section>
);

const TABLE_ROWS = 12;

/** The chart's window as a table, for reading the values without the chart; follows the zoom. */
const DataTable = ({ ctx, lines, view }: { ctx: ViewContext; lines: Line[]; view: View }) => {
  const span = view.end - view.start;
  const years = Array.from({ length: TABLE_ROWS }, (_, i) => yearAt(view, i / (TABLE_ROWS - 1)));
  const { ids, rows } = tableOf(lines, years);
  return (
    <details className="deeptime-table">
      <summary>{ctx.t('deeptime.table.show')}</summary>
      <table>
        <caption>{ctx.t('deeptime.table.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{ctx.t('deeptime.table.when')}</th>
            {ids.map((id) => (
              <th key={id} scope="col">
                {ctx.t(`deeptime.series.${id}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <th scope="row">{describeYear(ctx, r.year, span)}</th>
              {r.values.map((p, i) => (
                <td key={ids[i]}>{p ? valueText(ctx, p) : '–'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
};

const Status = ({ ctx, file }: { ctx: ViewContext; file: Loaded }) =>
  file === 'failed' ? (
    <p role="alert">{ctx.t('deeptime.failed')}</p>
  ) : file === 'loading' ? (
    <p role="status">{ctx.t('load.loading')}</p>
  ) : null;

export interface DeepTimeProps {
  ctx: ViewContext;
  result: RunResult | null | undefined;
}

/** What follows the chart: its window read out, its legend and caption, and its table. */
const UnderChart = ({
  ctx,
  view,
  lines,
}: {
  ctx: ViewContext;
  view: View | null;
  lines: Line[] | null;
}) => (
  <>
    <p className="visually-hidden" aria-live="polite">
      {view && chartTexts(ctx).label(view)}
    </p>
    <Legend ctx={ctx} />
    <p className="chart-caption">{ctx.t('deeptime.caption')}</p>
    {lines && view && <DataTable ctx={ctx} lines={lines} view={view} />}
  </>
);

/** The file's series and the run's, merged once each changes, and the run's 2100. */
const useSeries = (result: RunResult | null | undefined, currentYear: number) => {
  const file = useDeepTimeFile();
  const loaded = typeof file === 'object' ? file : null;
  const paleo = useMemo(() => loaded && paleoLines(loaded), [loaded]);
  const recent = useMemo(
    () => (result ? recentLines(result.temperature, currentYear) : []),
    [result, currentYear],
  );
  const lines = useMemo(() => (paleo ? [...paleo, ...recent] : null), [paleo, recent]);
  const end = useMemo(() => (result ? warmingIn2100(result.temperature) : null), [result]);
  return { file, loaded, recent, lines, end };
};

/** The deep-time page: a zoomable timeline of warming, ending with Explore's scenario. */
const DeepTime = ({ ctx: app, result }: DeepTimeProps) => {
  const ctx = useMemo(() => ({ ...app, t: withPageTexts(app.t, app.lang) }), [app]);
  const { file, loaded, recent, lines, end } = useSeries(result, ctx.currentYear);
  const [view, setView] = useState<View | null>(null);
  const { host, chart } = useChart(ctx, lines, end, setView);
  const light = useActiveMarker(host, view);
  const { t } = ctx;
  return (
    <div className="deeptime">
      <section className="card deeptime-main" aria-labelledby="deeptime-title">
        <div className="card-head">
          <h1 id="deeptime-title">{t('deeptime.title')}</h1>
          <span className="deeptime-badge">{t('deeptime.prototype')}</span>
        </div>
        <p className="card-text">{t('deeptime.intro')}</p>
        <p className="deeptime-context">{t('deeptime.context')}</p>
        <div className="deeptime-tools">
          <Presets ctx={ctx} view={view} go={(p) => chart.current?.go(PRESET_VIEWS[p])} />
          <Steps ctx={ctx} chart={chart.current} />
        </div>
        <Status ctx={ctx} file={file} />
        <div ref={host} className="deeptime-plot" />
        <UnderChart ctx={ctx} view={view} lines={lines} />
      </section>
      <Markers ctx={ctx} view={view} go={(v) => chart.current?.go(v)} light={light} />
      <ScenarioEnd ctx={ctx} end={end} />
      {loaded && result && <Rates ctx={ctx} file={loaded} lines={recent} />}
      {loaded && <Offsets ctx={ctx} file={loaded} />}
    </div>
  );
};

export default DeepTime;
