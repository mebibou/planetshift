import { area, line, scaleLinear, stack, stackOffsetDiverging, stackOrderNone } from 'd3';
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
  const render = () => {
    if (!last) return;
    const { attribution, gas, observed: observedSeries, from, end, avoided } = last;
    const labelOf = (c: Cause) =>
      gas !== 'all' && c === 'other' ? t('link.gasOther') : t(`link.causes.${c}`);
    caption.textContent = t(gas === 'all' ? 'link.attributionCaption' : 'link.gasCaption');
    const causes = causesIn(attribution);
    const levers = actsOn(avoided);
    legendEl.replaceChildren(
      legendList([
        ...causesBySize(attribution, end).map((c) => ({
          label: labelOf(c),
          className: `key-cause-${c}`,
        })),
        ...(levers ? [{ label: t('link.withoutLevers'), className: 'key-outline' }] : []),
        ...(observedSeries ? [{ label: t('chart.observed'), className: 'key-observed' }] : []),
      ]),
    );
    const baseRows = inRange(attributionRows(attribution), from, end);
    const rows = levers
      ? inRange(attributionRows(attribution, avoided ?? undefined), from, end)
      : baseRows;
    const stackOf = (data: CauseRow[]) =>
      stack<CauseRow, Cause>().keys(causes).order(stackOrderNone).offset(stackOffsetDiverging)(
        data,
      );
    const layers = stackOf(rows);
    const baseLayers = stackOf(baseRows);
    const observed = observedSeries
      ? inRange(zipSeries(observedSeries.years, observedSeries.values), from, end)
      : [];
    const narrow = (plotEl.clientWidth || 640) < 520;
    const f = frame(
      plotEl,
      narrow ? 280 : 360,
      MARGIN,
      gas === 'all'
        ? t('link.attributionLabel', { from, year: end })
        : t('link.gasAttributionLabel', { gas: t(`link.gasNames.${gas}`), from, year: end }),
    );
    const years = rows.map((r) => r.year);
    const x = scaleLinear()
      .domain([Math.min(...years), Math.max(...years)])
      .range([0, f.innerWidth]);
    const extent = [...layers, ...baseLayers].flatMap((l) => l.flatMap((p) => [p[0], p[1]]));
    const y = scaleLinear()
      .domain([Math.min(0, ...extent), Math.max(...extent, ...observed.map((p) => p.value))])
      .nice()
      .range([f.innerHeight, 0]);
    f.plot
      .append('rect')
      .attr('class', 'projection-shade')
      .attr('x', x(currentYear))
      .attr('width', Math.max(0, f.innerWidth - x(currentYear)))
      .attr('height', f.innerHeight);
    drawAxes(f, x, y, (v) => formatNumber(locale, v, 1));
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -MARGIN.left + 4)
      .attr('y', -10)
      .text(t('chart.unit'));
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
    if (levers) {
      const later = (l: (typeof baseLayers)[number]) =>
        l.filter((p) => p.data.year >= currentYear) as unknown as never;
      f.plot
        .append('g')
        .attr('class', 'baseline-outlines')
        .selectAll('path')
        .data(baseLayers)
        .join('path')
        .attr('class', (l) => `stack-outline outline-${l.key}`)
        .attr('d', (l) => areaOf(later(l)));
    }
    f.plot
      .append('line')
      .attr('class', 'zero')
      .attr('x1', 0)
      .attr('x2', f.innerWidth)
      .attr('y1', y(0))
      .attr('y2', y(0));
    if (observedSeries)
      f.plot
        .append('path')
        .datum(observed)
        .attr('class', 'line observed-line')
        .attr(
          'd',
          line<{ year: number; value: number }>()
            .x((p) => x(p.year))
            .y((p) => y(p.value)),
        );
    verticalRule(f, x(currentYear), String(currentYear));
    f.plot
      .append('text')
      .attr('class', 'shade-label')
      .attr('x', x(currentYear) + 6)
      .attr('y', 12)
      .text(t('link.projection'));
    addHover(
      plotEl,
      f,
      x,
      MARGIN,
      (year) => {
        const row = rows.find((r) => r.year === year);
        const base = baseRows.find((r) => r.year === year);
        const obs = observed.find((p) => p.year === year);
        const value = (c: Cause) => {
          if (!row) return '–';
          const now = formatTemperature(locale, row[c], 2, true);
          return base && Math.abs(base[c] - row[c]) >= 0.0005
            ? t('link.withoutValue', {
                value: now,
                without: formatTemperature(locale, base[c], 2, true),
              })
            : now;
        };
        return [
          ...causesBySize(attribution, end).map((c) => ({
            label: labelOf(c),
            value: value(c),
            swatch: `var(--cause-${c})`,
          })),
          ...(observedSeries
            ? [
                {
                  label: t('chart.observed'),
                  value: obs ? formatTemperature(locale, obs.value, 2) : '–',
                  swatch: 'var(--ink)',
                },
              ]
            : []),
        ];
      },
      t('chart.keys'),
    );
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
