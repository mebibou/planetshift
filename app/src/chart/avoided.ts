import { area, line, scaleLinear } from 'd3';
import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatNumber, formatTemperature } from '../i18n/format';
import type { ScenarioResult } from '../model/api';
import {
  addHover,
  drawAxes,
  frame,
  legendList,
  onResize,
  verticalRule,
  type Margin,
} from './frame';
import { inRange, zipBand, zipSeries } from './series';

/** The axis reaches at least this high, so a small shift looks small instead of filling the chart. */
const AXIS_FLOOR = 0.05;
const MARGIN: Margin = { top: 24, right: 16, bottom: 28, left: 56 };

export interface AvoidedChart {
  el: HTMLElement;
  update: (result: ScenarioResult, end: number) => void;
}

/** The warming the scenario avoids each year from now to 2050, on its own scale. */
export const avoidedChart = (t: T, locale: string, currentYear: number): AvoidedChart => {
  const plotEl = h('div', { class: 'chart-plot' });
  const el = h(
    'figure',
    { class: 'chart avoided-chart' },
    legendList([
      { label: t('avoidedChart.line'), className: 'key-scenario' },
      { label: t('chart.band'), className: 'key-band' },
    ]),
    plotEl,
    h('figcaption', {}, h('p', { class: 'chart-caption' }, t('avoidedChart.caption'))),
  );
  let last: [ScenarioResult, number] | null = null;
  const render = () => {
    if (!last) return;
    const [result, end] = last;
    const tp = result.temperature;
    const median = inRange(zipSeries(tp.years, tp.avoided.median), currentYear, end);
    const band = inRange(zipBand(tp.years, tp.avoided.p05, tp.avoided.p95), currentYear, end);
    const narrow = (plotEl.clientWidth || 640) < 520;
    const f = frame(plotEl, narrow ? 260 : 340, MARGIN, t('avoidedChart.label', { year: end }));
    const top = Math.max(AXIS_FLOOR, ...band.map((p) => p.hi), ...median.map((p) => p.value));
    const bottom = Math.min(0, ...band.map((p) => p.lo));
    const x = scaleLinear().domain([currentYear, end]).range([0, f.innerWidth]);
    const y = scaleLinear().domain([bottom, top]).nice().range([f.innerHeight, 0]);
    const digits = 2;
    drawAxes(f, x, y, (v) => formatNumber(locale, v, digits));
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -MARGIN.left + 4)
      .attr('y', -10)
      .text(t('avoidedChart.unit'));
    if (end > 2050) verticalRule(f, x(2050), '2050');
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
    f.plot
      .append('path')
      .datum(median)
      .attr('class', 'line scenario-line')
      .attr(
        'd',
        line<{ year: number; value: number }>()
          .x((p) => x(p.year))
          .y((p) => y(p.value)),
      );
    addHover(plotEl, f, x, MARGIN, (year) => {
      const i = tp.years.indexOf(year);
      const v = tp.avoided.median[i];
      return [
        {
          label: t('avoidedChart.line'),
          value: v === undefined ? '–' : formatTemperature(locale, v, 3),
          swatch: 'var(--series-scenario)',
        },
      ];
    });
  };
  onResize(plotEl, render);
  return {
    el,
    update: (result, end) => {
      last = [result, end];
      render();
    },
  };
};
