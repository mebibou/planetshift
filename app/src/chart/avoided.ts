import {
  area,
  line,
  scaleLinear,
  stack,
  stackOffsetDiverging,
  stackOrderNone,
  type ScaleLinear,
} from 'd3';
import { h } from '../app/dom';
import type { AvoidedView } from '../app/url';
import type { T } from '../i18n/i18n';
import { formatNumber, formatTemperature } from '../i18n/format';
import { foodLabel } from '../levers/registry';
import type { ScenarioResult } from '../model/api';
import {
  addHover,
  drawAxes,
  frame,
  isTight,
  tightened,
  legendList,
  offIn,
  onResize,
  verticalRule,
  type Frame,
  type HoverRow,
  type LegendEntry,
  type Margin,
} from './frame';
import { foodRows, type FoodBand, type FoodRow } from './foods';
import { inRange, zipBand, zipSeries } from './series';

/** The axis reaches at least this high, so a small shift looks small instead of filling the chart. */
const AXIS_FLOOR = 0.05;
const MARGIN: Margin = { top: 24, right: 16, bottom: 28, left: 56 };
/** Below this, every year reads 0.000 °C: the levers avoid nothing yet. */
const NOTHING = 0.0005;
/** The categorical colours the foods take in turn, then the one left. */
const FOOD_COLOURS = [1, 2, 3, 4, 5, 6, 7].map((k) => `var(--waste-${k})`);
const LAST_FOOD = 'var(--series-natural)';
const OTHER = 'other';

export interface AvoidedChart {
  el: HTMLElement;
  update: (result: ScenarioResult, end: number, view?: AvoidedView) => void;
}

type Scale = ScaleLinear<number, number>;

const colourOf = (k: number): string => FOOD_COLOURS[k] ?? LAST_FOOD;

/** Each food's band, in order, with its colour and label, then the other levers'. */
const foodKeys = (t: T, bands: readonly FoodBand[]) => [
  ...bands.map((b, k) => ({
    key: b.key,
    label: t(foodLabel(b.family, b.food)),
    colour: colourOf(k),
  })),
  { key: OTHER, label: t('avoidedChart.other'), colour: 'var(--series-baseline)' },
];

const drawEmpty = (f: Frame, t: T) =>
  f.plot
    .append('text')
    .attr('class', 'chart-empty')
    .selectAll('tspan')
    .data([t('avoidedChart.empty'), t('avoidedChart.emptyHint')])
    .join('tspan')
    .attr('x', f.innerWidth / 2)
    .attr('y', (_, i) => f.innerHeight / 2 + (i - 0.5) * 20)
    .text((s) => s);

const drawFrame = (
  f: Frame,
  t: T,
  locale: string,
  scales: { x: Scale; y: Scale },
  margin: Margin,
  end: number,
) => {
  drawAxes(f, scales.x, scales.y, (v) => formatNumber(locale, v, 2));
  f.plot
    .append('text')
    .attr('class', 'axis-title')
    .attr('x', -margin.left + 4)
    .attr('y', -10)
    .text(t('avoidedChart.unit'));
  if (end > 2050) {
    verticalRule(f, scales.x(2050), '2050');
  }
};

const totalLine = (f: Frame, { x, y }: { x: Scale; y: Scale }, points: readonly Point[]) =>
  f.plot
    .append('path')
    .datum(points)
    .attr('class', 'line scenario-line')
    .attr(
      'd',
      line<Point>()
        .x((p) => x(p.year))
        .y((p) => y(p.value)),
    );

interface Point {
  year: number;
  value: number;
}

/** The total with its likely range, as one line over a band. */
const drawTotal = (
  t: T,
  locale: string,
  plotEl: HTMLElement,
  result: ScenarioResult,
  { currentYear, end }: { currentYear: number; end: number },
) => {
  const tp = result.temperature;
  const median = inRange(zipSeries(tp.years, tp.avoided.median), currentYear, end);
  const band = inRange(zipBand(tp.years, tp.avoided.p05, tp.avoided.p95), currentYear, end);
  const narrow = (plotEl.clientWidth || 640) < 520;
  const margin = tightened(MARGIN, isTight(plotEl));
  const f = frame(plotEl, narrow ? 260 : 340, margin, t('avoidedChart.label', { year: end }));
  const top = Math.max(AXIS_FLOOR, ...band.map((p) => p.hi), ...median.map((p) => p.value));
  const bottom = Math.min(0, ...band.map((p) => p.lo));
  const x = scaleLinear().domain([currentYear, end]).range([0, f.innerWidth]);
  const y = scaleLinear().domain([bottom, top]).nice().range([f.innerHeight, 0]);
  drawFrame(f, t, locale, { x, y }, margin, end);
  if (median.every((p) => Math.abs(p.value) < NOTHING)) {
    drawEmpty(f, t);
  }
  f.plot
    .append('path')
    .datum(band)
    .attr('class', 'band scenario-band')
    .attr(
      'd',
      area<{ year: number; lo: number; hi: number }>()
        .x((p) => x(p.year))
        .y0((p) => y(p.lo))
        .y1((p) => y(p.hi)),
    );
  totalLine(f, { x, y }, median);
  addHover(
    plotEl,
    f,
    x,
    margin,
    (year) => {
      const v = tp.avoided.median[tp.years.indexOf(year)];
      return [
        {
          label: t('avoidedChart.line'),
          value: v === undefined ? '–' : formatTemperature(locale, v, 3),
          swatch: 'var(--series-scenario)',
          toggle: 'scenario',
        },
      ];
    },
    t('chart.keys'),
  );
};

/** The hover's rows in a year: each food and the other levers, biggest first, then the total. */
const foodHover =
  (t: T, locale: string, keys: ReturnType<typeof foodKeys>, rows: readonly FoodRow[]) =>
  (year: number): HoverRow[] => {
    const row = rows.find((r) => r.year === year);
    const at = (key: string) => (row ? (row[key] ?? 0) : 0);
    return [
      ...[...keys]
        .sort((a, b) => at(b.key) - at(a.key))
        .map((k) => ({
          label: k.label,
          value: row ? formatTemperature(locale, at(k.key), 3) : '–',
          swatch: k.colour,
          toggle: k.key,
        })),
      {
        label: t('avoidedChart.total'),
        value: row ? formatTemperature(locale, row.total, 3) : '–',
        swatch: 'var(--series-scenario)',
      },
    ];
  };

/**
 * The warming avoided stacked by the food each lever shifts (the diet's animal foods, the plant
 * foods swapped), the other levers as the rest, and the total over them. A band that adds
 * warming goes below zero.
 */
const drawFoods = (
  t: T,
  locale: string,
  plotEl: HTMLElement,
  legendEl: HTMLElement,
  render: () => void,
  result: ScenarioResult,
  { currentYear, end }: { currentYear: number; end: number },
) => {
  const { bands, rows } = foodRows(result, currentYear, end);
  const keys = foodKeys(t, bands);
  const off = offIn(legendEl);
  const legend: LegendEntry[] = keys.map((k) => ({
    label: k.label,
    className: `key-food key-food-${k.key.replace('.', '-')}`,
    toggle: k.key,
  }));
  legendEl.replaceChildren(legendList(legend, render, off));
  legendEl
    .querySelectorAll<HTMLElement>('.key-food')
    .forEach((el, k) => el.style.setProperty('background', keys[k]?.colour ?? ''));
  const shown = keys.filter((k) => !off.has(k.key));
  const layers = stack<FoodRow, string>()
    .keys(shown.map((k) => k.key))
    .value((r, key) => r[key] ?? 0)
    .order(stackOrderNone)
    .offset(stackOffsetDiverging)(rows);
  const narrow = (plotEl.clientWidth || 640) < 520;
  const margin = tightened(MARGIN, isTight(plotEl));
  const f = frame(plotEl, narrow ? 260 : 340, margin, t('avoidedChart.foodLabel', { year: end }));
  const extent = layers.flatMap((l) => l.flatMap((p) => [p[0], p[1]]));
  const x = scaleLinear().domain([currentYear, end]).range([0, f.innerWidth]);
  const y = scaleLinear()
    .domain([Math.min(0, ...extent), Math.max(AXIS_FLOOR, ...extent, ...rows.map((r) => r.total))])
    .nice()
    .range([f.innerHeight, 0]);
  drawFrame(f, t, locale, { x, y }, margin, end);
  if (rows.every((r) => Math.abs(r.total) < NOTHING)) {
    drawEmpty(f, t);
  }
  const areaOf = area<[number, number] & { data: FoodRow }>()
    .x((p) => x(p.data.year))
    .y0((p) => y(p[0]))
    .y1((p) => y(p[1]));
  f.plot
    .append('g')
    .selectAll('path')
    .data(layers)
    .join('path')
    .attr('class', 'stack food-stack')
    .attr('data-food', (l) => l.key)
    .style('fill', (l) => keys.find((k) => k.key === l.key)?.colour ?? '')
    .attr('d', (l) => areaOf(l as never));
  totalLine(
    f,
    { x, y },
    rows.map((r) => ({ year: r.year, value: r.total })),
  );
  addHover(plotEl, f, x, margin, foodHover(t, locale, shown, rows), t('chart.keys'));
};

/** The warming the scenario avoids each year from now to the horizon, in all or by food. */
export const avoidedChart = (t: T, locale: string, currentYear: number): AvoidedChart => {
  const plotEl = h('div', {
    class: 'chart-plot',
    style: '--plot-h: 340px; --plot-h-narrow: 260px',
    'data-loading': t('load.loading'),
  });
  const totalLegend = legendList([
    { label: t('avoidedChart.line'), className: 'key-scenario', toggle: 'scenario' },
    { label: t('chart.band'), className: 'key-band', toggle: 'band' },
  ]);
  const legendEl = h('div', { class: 'legend-slot' }, totalLegend);
  const caption = h('p', { class: 'chart-caption' }, t('avoidedChart.caption'));
  const el = h(
    'figure',
    { class: 'chart avoided-chart' },
    legendEl,
    plotEl,
    h('figcaption', {}, caption),
  );
  let last: [ScenarioResult, number, AvoidedView] | null = null;
  const render = () => {
    if (last) {
      const [result, end, view] = last;
      el.dataset.view = view;
      caption.textContent = t(
        view === 'food' ? 'avoidedChart.foodCaption' : 'avoidedChart.caption',
      );
      if (view === 'food') {
        drawFoods(t, locale, plotEl, legendEl, render, result, { currentYear, end });
      } else {
        legendEl.replaceChildren(totalLegend);
        drawTotal(t, locale, plotEl, result, { currentYear, end });
      }
    }
  };
  onResize(plotEl, render);
  return {
    el,
    update: (result, end, view = 'total') => {
      last = [result, end, view];
      render();
    },
  };
};
