import {
  area,
  line,
  scaleLinear,
  stack,
  stackOffsetDiverging,
  stackOrderNone,
  type ScaleLinear,
  type Series as Series$,
} from 'd3';
import { h } from '../app/dom';
import type { Cause, LeverCause, Series } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatNumber, formatTemperature } from '../i18n/format';
import {
  addHover,
  drawAxes,
  frame,
  legendList,
  onResize,
  verticalRule,
  type Frame,
  type HoverRow,
  type Margin,
} from './frame';
import {
  attributionRows,
  causesBySize,
  causesIn,
  inRange,
  zipSeries,
  type Attribution,
  type CauseGas,
  type CauseRow,
} from './series';

const MARGIN: Margin = { top: 24, right: 16, bottom: 28, left: 48 };

/** What the levers avoid by cause each year (`years` are the temperature years). */
export interface AvoidedByCause {
  years: readonly number[];
  byCause: Readonly<Partial<Record<LeverCause, readonly number[]>>>;
}

/** What the chart draws: every cause with the temperature measured, or one gas's causes alone. */
export interface AttributionView {
  attribution: Attribution;
  gas: CauseGas;
  observed: Series | null;
  from: number;
  end: number;
  avoided: AvoidedByCause | null;
}

export interface AttributionChart {
  el: HTMLElement;
  update: (view: AttributionView) => void;
}

/** Whether the levers move any cause by a visible amount. */
const actsOn = (avoided: AvoidedByCause | null): boolean =>
  avoided !== null &&
  Object.values(avoided.byCause).some((s) => s.some((v) => Math.abs(v) >= 0.0005));

type Scale = ScaleLinear<number, number>;
type Layer = Series$<CauseRow, Cause>;
interface Point {
  year: number;
  value: number;
}

/** A cause's name; under one gas, `other` is the gas's other sources and interactions. */
const causeLabel =
  (t: T, gas: CauseGas) =>
  (c: Cause): string =>
    gas !== 'all' && c === 'other' ? t('link.gasOther') : t(`link.causes.${c}`);

const legendKeys = (t: T, view: AttributionView, levers: boolean) => [
  ...causesBySize(view.attribution, view.end).map((c) => ({
    label: causeLabel(t, view.gas)(c),
    className: `key-cause-${c}`,
  })),
  ...(levers ? [{ label: t('link.withoutLevers'), className: 'key-outline' }] : []),
  ...(view.observed ? [{ label: t('chart.observed'), className: 'key-observed' }] : []),
];

/** The rows without the levers, and with them when they act. */
const rowsOf = (view: AttributionView, levers: boolean) => {
  const { attribution, from, end, avoided } = view;
  const baseRows = inRange(attributionRows(attribution), from, end);
  return {
    baseRows,
    rows: levers && avoided ? inRange(attributionRows(attribution, avoided), from, end) : baseRows,
  };
};

const stackOf = (causes: Cause[], data: CauseRow[]): Layer[] =>
  stack<CauseRow, Cause>().keys(causes).order(stackOrderNone).offset(stackOffsetDiverging)(data);

const observedPoints = ({ observed, from, end }: AttributionView): Point[] =>
  observed ? inRange(zipSeries(observed.years, observed.values), from, end) : [];

const chartLabel = (t: T, { gas, from, end }: AttributionView): string =>
  gas === 'all'
    ? t('link.attributionLabel', { from, year: end })
    : t('link.gasAttributionLabel', { gas: t(`link.gasNames.${gas}`), from, year: end });

/** The scales: years across, and every stacked band and the observed line up. */
const scalesOf = (f: Frame, rows: CauseRow[], layers: Layer[], observed: Point[]) => {
  const years = rows.map((r) => r.year);
  const extent = layers.flatMap((l) => l.flatMap((p) => [p[0], p[1]]));
  return {
    x: scaleLinear()
      .domain([Math.min(...years), Math.max(...years)])
      .range([0, f.innerWidth]),
    y: scaleLinear()
      .domain([Math.min(0, ...extent), Math.max(...extent, ...observed.map((p) => p.value))])
      .nice()
      .range([f.innerHeight, 0]),
  };
};

/** The shaded projection after the current year, with its rule and label. */
const drawProjection = (f: Frame, x: Scale, currentYear: number, t: T): void => {
  f.plot
    .append('rect')
    .attr('class', 'projection-shade')
    .attr('x', x(currentYear))
    .attr('width', Math.max(0, f.innerWidth - x(currentYear)))
    .attr('height', f.innerHeight);
  verticalRule(f, x(currentYear), String(currentYear));
  f.plot
    .append('text')
    .attr('class', 'shade-label')
    .attr('x', x(currentYear) + 6)
    .attr('y', 12)
    .text(t('link.projection'));
};

const drawFrame = (f: Frame, x: Scale, y: Scale, t: T, locale: string): void => {
  drawAxes(f, x, y, (v) => formatNumber(locale, v, 1));
  f.plot
    .append('text')
    .attr('class', 'axis-title')
    .attr('x', -MARGIN.left + 4)
    .attr('y', -10)
    .text(t('chart.unit'));
};

/** The stacked bands, and the bands without the levers as outlines from the current year. */
const drawStacks = (
  f: Frame,
  { x, y }: { x: Scale; y: Scale },
  layers: Layer[],
  outlines: Layer[],
  currentYear: number,
): void => {
  const areaOf = area<[number, number] & { data: { year: number } }>()
    .x((p) => x(p.data.year))
    .y0((p) => y(p[0]))
    .y1((p) => y(p[1]));
  f.plot
    .append('g')
    .selectAll('path')
    .data(layers)
    .join('path')
    .attr('class', (l) => `stack cause-${l.key}`)
    .attr('data-cause', (l) => l.key)
    .attr('d', (l) => areaOf(l as never));
  f.plot
    .append('g')
    .attr('class', 'baseline-outlines')
    .selectAll('path')
    .data(outlines)
    .join('path')
    .attr('class', (l) => `stack-outline outline-${l.key}`)
    .attr('d', (l) => areaOf(l.filter((p) => p.data.year >= currentYear) as never));
};

const drawLines = (f: Frame, x: Scale, y: Scale, observed: Point[]): void => {
  f.plot
    .append('line')
    .attr('class', 'zero')
    .attr('x1', 0)
    .attr('x2', f.innerWidth)
    .attr('y1', y(0))
    .attr('y2', y(0));
  if (observed.length)
    f.plot
      .append('path')
      .datum(observed)
      .attr('class', 'line observed-line')
      .attr(
        'd',
        line<Point>()
          .x((p) => x(p.year))
          .y((p) => y(p.value)),
      );
};

/** A cause's warming in a row, with its value without the levers when they move it. */
const cellText = (
  t: T,
  locale: string,
  c: Cause,
  row: CauseRow | undefined,
  base: CauseRow | undefined,
): string => {
  const now = row ? formatTemperature(locale, row[c], 2, true) : '–';
  return row && base && Math.abs(base[c] - row[c]) >= 0.0005
    ? t('link.withoutValue', { value: now, without: formatTemperature(locale, base[c], 2, true) })
    : now;
};

/** The hover's rows in a year: each cause, biggest first, then the temperature measured. */
const hoverRows =
  (
    t: T,
    locale: string,
    view: AttributionView,
    rows: ReturnType<typeof rowsOf>,
    observed: Point[],
  ) =>
  (year: number): HoverRow[] => {
    const row = rows.rows.find((r) => r.year === year);
    const base = rows.baseRows.find((r) => r.year === year);
    const obs = observed.find((p) => p.year === year);
    return [
      ...causesBySize(view.attribution, view.end).map((c) => ({
        label: causeLabel(t, view.gas)(c),
        value: cellText(t, locale, c, row, base),
        swatch: `var(--cause-${c})`,
      })),
      ...(view.observed
        ? [
            {
              label: t('chart.observed'),
              value: obs ? formatTemperature(locale, obs.value, 2) : '–',
              swatch: 'var(--ink)',
            },
          ]
        : []),
    ];
  };

/**
 * Warming by cause, stacked (cooling causes below zero), with observed temperature over it.
 * After today each cause's band is what is left once the levers act; the bands without the
 * levers are drawn as faint outlines, so the reduction shows.
 */
export const attributionChart = (t: T, locale: string, currentYear: number): AttributionChart => {
  const plotEl = h('div', { class: 'chart-plot' });
  const legendEl = h('div', { class: 'legend-slot' });
  const caption = h('figcaption', {}, t('link.attributionCaption'));
  const el = h('figure', { class: 'chart attribution-chart' }, legendEl, plotEl, caption);
  let last: AttributionView | null = null;
  const draw = (view: AttributionView) => {
    const levers = actsOn(view.avoided);
    caption.textContent = t(view.gas === 'all' ? 'link.attributionCaption' : 'link.gasCaption');
    legendEl.replaceChildren(legendList(legendKeys(t, view, levers)));
    const causes = causesIn(view.attribution);
    const rows = rowsOf(view, levers);
    const layers = stackOf(causes, rows.rows);
    const outlines = levers ? stackOf(causes, rows.baseRows) : [];
    const observed = observedPoints(view);
    const narrow = (plotEl.clientWidth || 640) < 520;
    const f = frame(plotEl, narrow ? 280 : 360, MARGIN, chartLabel(t, view));
    const scales = scalesOf(f, rows.rows, [...layers, ...stackOf(causes, rows.baseRows)], observed);
    drawProjection(f, scales.x, currentYear, t);
    drawFrame(f, scales.x, scales.y, t, locale);
    drawStacks(f, scales, layers, outlines, currentYear);
    drawLines(f, scales.x, scales.y, observed);
    addHover(
      plotEl,
      f,
      scales.x,
      MARGIN,
      hoverRows(t, locale, view, rows, observed),
      t('chart.keys'),
    );
  };
  const render = () => {
    if (last) draw(last);
  };
  onResize(plotEl, render);
  return {
    el,
    update: (view) => {
      last = view;
      render();
    },
  };
};
