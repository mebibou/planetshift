import { area, line, scaleLinear } from 'd3';
import { h } from '../app/dom';
import { GASES, type Gas, type Series } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatNumber, formatSignificant, massUnit } from '../i18n/format';
import { addHover, drawAxes, frame, onResize, verticalRule, type Margin } from './frame';
import { inRange, zipSeries } from './series';

const MARGIN: Margin = { top: 20, right: 12, bottom: 26, left: 44 };

export interface GasMultiples {
  el: HTMLElement;
  update: (emissions: Record<Gas, Series>, from: number, end: number) => void;
}

/** One small chart per gas, each on its own axis and unit. */
export const gasMultiples = (t: T, locale: string, currentYear: number): GasMultiples => {
  const cells = GASES.map((gas) => {
    const plot = h('div', { class: 'chart-plot' });
    const title = h('h3', {}, t(`gases.${gas}`));
    return {
      gas,
      plot,
      el: h('figure', { class: 'chart gas-chart', 'data-gas': gas }, title, plot),
    };
  });
  let last: { emissions: Record<Gas, Series>; from: number; end: number } | null = null;
  const renderOne = (gas: Gas, plotEl: HTMLElement, series: Series, from: number, end: number) => {
    const points = inRange(zipSeries(series.years, series.values), from, end);
    const max = Math.max(0, ...points.map((p) => p.value));
    const unit = massUnit(max);
    const f = frame(
      plotEl,
      200,
      MARGIN,
      t('link.gasLabel', { gas: t(`gases.${gas}`), from, year: end }),
    );
    const x = scaleLinear()
      .domain([points[0]?.year ?? from, points.at(-1)?.year ?? end])
      .range([0, f.innerWidth]);
    const y = scaleLinear()
      .domain([0, max / unit.factor])
      .nice()
      .range([f.innerHeight, 0]);
    drawAxes(f, x, y, (v) => formatNumber(locale, v, 1), 4);
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -MARGIN.left + 4)
      .attr('y', -8)
      .text(t('link.perYear', { unit: unit.unit }));
    const scaled = points.map((p) => ({ year: p.year, value: p.value / unit.factor }));
    f.plot
      .append('path')
      .datum(scaled)
      .attr('class', 'gas-area')
      .attr(
        'd',
        area<{ year: number; value: number }>()
          .x((p) => x(p.year))
          .y0(y(0))
          .y1((p) => y(p.value)),
      );
    f.plot
      .append('path')
      .datum(scaled)
      .attr('class', 'line gas-line')
      .attr(
        'd',
        line<{ year: number; value: number }>()
          .x((p) => x(p.year))
          .y((p) => y(p.value)),
      );
    verticalRule(f, x(currentYear), String(currentYear));
    addHover(plotEl, f, x, MARGIN, (year) => {
      const p = scaled.find((s) => s.year === year);
      return [
        {
          label: t(`gases.${gas}`),
          value: p ? `${formatSignificant(locale, p.value, 3)} ${unit.unit}` : '–',
        },
      ];
    });
  };
  const render = () => {
    if (last) {
      const { emissions, from, end } = last;
      cells.forEach((c) => renderOne(c.gas, c.plot, emissions[c.gas], from, end));
    }
  };
  const el = h('div', { class: 'gas-multiples' }, ...cells.map((c) => c.el));
  cells.forEach((c) => onResize(c.plot, render));
  return {
    el,
    update: (emissions, from, end) => {
      last = { emissions, from, end };
      render();
    },
  };
};
