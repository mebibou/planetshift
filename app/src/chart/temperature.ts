import { area, line, scaleLinear } from 'd3';
import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatNumber, formatTemperature } from '../i18n/format';
import type { BandSeries, Enso } from '../data/types';
import type { ScenarioResult } from '../model/api';
import { CURRENT_POLICIES, LEVELS, milestones, type Level } from '../app/milestones';
import {
  addHover,
  drawAxes,
  frame,
  legendList,
  onResize,
  verticalRule,
  type Margin,
} from './frame';
import { ensoMarks, gapAt, inRange, zipBand, zipSeries } from './series';

export type Range = 'full' | 'recent';
export const RANGE_START: Record<Range, number> = { full: 1850, recent: 2000 };

export interface TemperatureChart {
  el: HTMLElement;
  update: (
    result: ScenarioResult,
    range: Range,
    end: number,
    natural?: BandSeries | undefined,
    enso?: Enso | undefined,
  ) => void;
  /** A place under the chart for another small chart, such as population. */
  slot: HTMLElement;
}

const MARGIN: Margin = { top: 24, right: 16, bottom: 28, left: 48 };
/** Room on the right for the current-policies band at 2100. */
const MARGIN_2100: Margin = { ...MARGIN, right: 30 };

/** A level's key in the dictionaries: `p15` for 1.5 °C, `p2` for 2 °C. */
export const levelKey = (level: Level): string => `p${String(level).replace('.', '')}`;

/** Where a crossing year's label goes, so that it stays inside the plot. */
const anchorAt = (x: number, width: number) =>
  x > width - 24 ? 'end' : x < 24 ? 'start' : 'middle';

/**
 * Observed line, baseline and scenario medians with 5–95% bands, the gap at the horizon, the
 * Paris Agreement's levels with the years each median crosses them, the current-policies band at
 * 2100, and, when the data has them, natural factors alone and dots on the observed line in El
 * Niño and La Niña years. Totals only: the causes of warming have their own chart.
 */
export const temperatureChart = (t: T, locale: string, currentYear: number): TemperatureChart => {
  const plotEl = h('div', { class: 'chart-plot' });
  const caption = h('p', { class: 'chart-caption' });
  const milestoneCaption = h('p', { class: 'chart-caption milestone-caption' });
  const legend = legendList([
    { label: t('chart.observed'), className: 'key-observed' },
    { label: t('chart.baseline'), className: 'key-baseline' },
    { label: t('chart.scenario'), className: 'key-scenario' },
    { label: t('chart.band'), className: 'key-band' },
    { label: t('chart.natural'), className: 'key-natural' },
    { label: t('chart.enso.legend'), className: 'key-enso' },
    { label: t('milestones.levels.short'), className: 'key-milestone' },
    { label: t('milestones.policies.short'), className: 'key-policies' },
  ]);
  const legendItem = (className: string) =>
    legend.querySelector(`.${className}`)?.parentElement ?? null;
  const slot = h('div', { class: 'chart-slot' });
  const el = h(
    'figure',
    { class: 'chart temperature-chart' },
    legend,
    plotEl,
    h('figcaption', {}, caption, milestoneCaption),
    slot,
  );
  let last: [ScenarioResult, Range, number, BandSeries | undefined, Enso | undefined] | null = null;
  const render = () => {
    if (!last) return;
    const [result, range, end, natural, enso] = last;
    const tp = result.temperature;
    const from = RANGE_START[range];
    const narrow = (plotEl.clientWidth || 640) < 520;
    const reaches2100 = end >= 2100;
    const margin = reaches2100 ? MARGIN_2100 : MARGIN;
    const f = frame(plotEl, narrow ? 280 : 360, margin, t('chart.label', { year: end }));
    const future = (y: number) => y >= currentYear;
    const observed = inRange(zipSeries(tp.years, tp.observed), from, end);
    const baseMedian = inRange(zipSeries(tp.years, tp.baseline.median), from, end);
    const scenMedian = inRange(zipSeries(tp.years, tp.scenario.median), from, end).filter((p) =>
      future(p.year),
    );
    const baseBand = inRange(zipBand(tp.years, tp.baseline.p05, tp.baseline.p95), from, end).filter(
      (p) => future(p.year),
    );
    const scenBand = inRange(zipBand(tp.years, tp.scenario.p05, tp.scenario.p95), from, end).filter(
      (p) => future(p.year),
    );
    const naturalLine = natural ? inRange(zipSeries(natural.years, natural.median), from, end) : [];
    const values = [
      0,
      ...LEVELS,
      ...(reaches2100 ? [CURRENT_POLICIES.high] : []),
      ...naturalLine.map((p) => p.value),
      ...observed.map((p) => p.value),
      ...baseBand.flatMap((p) => [p.lo, p.hi]),
      ...scenBand.flatMap((p) => [p.lo, p.hi]),
      ...baseMedian.map((p) => p.value),
    ];
    const x = scaleLinear().domain([from, end]).range([0, f.innerWidth]);
    const y = scaleLinear()
      .domain([Math.min(...values), Math.max(...values)])
      .nice()
      .range([f.innerHeight, 0]);
    drawAxes(f, x, y, (v) => formatNumber(locale, v, 1));
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -margin.left + 4)
      .attr('y', -10)
      .text(t('chart.unit'));
    LEVELS.forEach((level) => {
      const g = f.plot.append('g').attr('class', 'milestone').attr('data-level', String(level));
      g.append('title').text(t(`milestones.levels.${levelKey(level)}.full`));
      g.append('line')
        .attr('x1', 0)
        .attr('x2', f.innerWidth)
        .attr('y1', y(level))
        .attr('y2', y(level));
      g.append('text')
        .attr('x', 4)
        .attr('y', y(level) - 5)
        .text(t(`milestones.levels.${levelKey(level)}.short`));
    });
    if (reaches2100) {
      const g = f.plot.append('g').attr('class', 'policies');
      g.append('title').text(t('milestones.policies.full'));
      g.append('rect')
        .attr('x', f.innerWidth + 4)
        .attr('width', 8)
        .attr('y', y(CURRENT_POLICIES.high))
        .attr('height', Math.max(2, y(CURRENT_POLICIES.low) - y(CURRENT_POLICIES.high)));
    }
    const bandArea = area<{ year: number; lo: number; hi: number }>()
      .x((p) => x(p.year))
      .y0((p) => y(p.lo))
      .y1((p) => y(p.hi));
    const lineOf = line<{ year: number; value: number }>()
      .x((p) => x(p.year))
      .y((p) => y(p.value));
    f.plot.append('path').datum(baseBand).attr('class', 'band baseline-band').attr('d', bandArea);
    f.plot.append('path').datum(scenBand).attr('class', 'band scenario-band').attr('d', bandArea);
    f.plot.append('path').datum(scenMedian).attr('class', 'line scenario-line').attr('d', lineOf);
    f.plot.append('path').datum(baseMedian).attr('class', 'line baseline-line').attr('d', lineOf);
    if (naturalLine.length)
      f.plot.append('path').datum(naturalLine).attr('class', 'line natural-line').attr('d', lineOf);
    f.plot.append('path').datum(observed).attr('class', 'line observed-line').attr('d', lineOf);
    const marks = ensoMarks(enso, observed);
    f.plot
      .append('g')
      .attr('class', 'enso-marks')
      .selectAll('circle')
      .data(marks)
      .join('circle')
      .attr('class', (m) => `enso-mark enso-${m.phase}`)
      .attr('cx', (m) => x(m.year))
      .attr('cy', (m) => y(m.value))
      .attr('r', narrow ? 2 : 2.5);
    milestones(tp, currentYear).levels.forEach((m) => {
      const shown = (year: number | null): year is number =>
        year !== null && year >= from && year <= end;
      const g = f.plot.append('g').attr('class', 'crossings').attr('data-level', String(m.level));
      const dot = (year: number, className: string, dy: number) => {
        const cx = x(year);
        g.append('circle')
          .attr('class', className)
          .attr('cx', cx)
          .attr('cy', y(m.level))
          .attr('r', 4)
          .append('title')
          .text(String(year));
        if (narrow) return;
        g.append('text')
          .attr('class', `${className}-label`)
          .attr('x', cx)
          .attr('y', y(m.level) + dy)
          .attr('text-anchor', anchorAt(cx, f.innerWidth))
          .text(String(year));
      };
      if (shown(m.baseline) && m.baseline !== m.scenario) dot(m.baseline, 'crossing-baseline', 15);
      if (shown(m.scenario)) dot(m.scenario, 'crossing-scenario', -7);
    });
    verticalRule(f, x(currentYear), String(currentYear));
    if (end > 2050) verticalRule(f, x(2050), '2050');
    verticalRule(f, x(end), String(end));
    const gap = gapAt(tp.years, tp.baseline.median, tp.scenario.median, end);
    const baseEnd = baseMedian.at(-1);
    const scenEnd = scenMedian.at(-1);
    const gapValue =
      gap === null ? '–' : formatTemperature(locale, gap, Math.abs(gap) < 0.1 ? 3 : 2, true);
    const gapText = gap === null ? '' : t('chart.gap', { value: gapValue, year: end });
    if (baseEnd && scenEnd && gap !== null) {
      const g = f.plot.append('g').attr('class', 'gap-annotation');
      const [ya, yb] = [y(baseEnd.value), y(scenEnd.value)];
      const xr = x(end) - 6;
      g.append('path').attr('d', `M${xr - 4},${ya}H${xr}V${yb}H${xr - 4}`);
      g.append('text')
        .attr('x', xr - 8)
        .attr('y', Math.min(ya, yb) - 8)
        .attr('text-anchor', 'end')
        .text(gapText);
    }
    caption.textContent = t('chart.caption', { gap: gapValue, year: end });
    milestoneCaption.textContent = [
      t('milestones.caption'),
      reaches2100 ? t('milestones.policies.caption') : '',
    ]
      .filter(Boolean)
      .join(' ');
    const naturalItem = legendItem('key-natural');
    if (naturalItem) naturalItem.hidden = naturalLine.length === 0;
    const ensoItem = legendItem('key-enso');
    if (ensoItem) ensoItem.hidden = marks.length === 0;
    const ensoAt = new Map(marks.map((m) => [m.year, m]));
    const policiesItem = legendItem('key-policies');
    if (policiesItem) policiesItem.hidden = !reaches2100;
    const at = (years: number[], values: (number | null)[], year: number) => {
      const i = years.indexOf(year);
      const v = i < 0 ? null : values[i];
      return v === null || v === undefined ? '–' : formatTemperature(locale, v, 2);
    };
    addHover(plotEl, f, x, margin, (year) => [
      { label: t('chart.observed'), value: at(tp.years, tp.observed, year), swatch: 'var(--ink)' },
      ...[ensoAt.get(year)].flatMap((m) =>
        m
          ? [
              {
                label: t(`chart.enso.${m.phase}`),
                value: t('chart.enso.oni', { value: formatTemperature(locale, m.oni, 1, true) }),
                swatch: `var(--enso-${m.phase})`,
              },
            ]
          : [],
      ),
      {
        label: t('chart.baseline'),
        value: at(tp.years, tp.baseline.median, year),
        swatch: 'var(--series-baseline)',
      },
      {
        label: t('chart.scenario'),
        value: at(tp.years, tp.scenario.median, year),
        swatch: 'var(--series-scenario)',
      },
      ...(natural
        ? [
            {
              label: t('chart.natural'),
              value: at(natural.years, natural.median, year),
              swatch: 'var(--series-natural)',
            },
          ]
        : []),
    ]);
  };
  onResize(plotEl, render);
  return {
    el,
    update: (result, range, end, natural, enso) => {
      last = [result, range, end, natural, enso];
      render();
    },
    slot,
  };
};
