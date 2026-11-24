import { line, scaleLinear } from 'd3';
import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatNumber, formatTemperature } from '../i18n/format';
import type { Ssp } from '../data/types';
import type { ScenarioResult } from '../model/api';
import { valueAt } from '../app/summaryModel';
import { VARIANTS } from '../levers/population/data';
import type { WorldPopulation } from '../levers/population/model';
import {
  addHover,
  drawAxes,
  frame,
  legendList,
  onResize,
  verticalRule,
  type HoverLink,
  type Margin,
} from './frame';
import { inRange, zipSeries, type Point } from './series';
import { RANGE_START, type Range } from './temperature';

export interface PopulationChart {
  el: HTMLElement;
  /** `mediumBaseline`: the baseline's median at `end` under the UN's medium projection. */
  update: (
    result: ScenarioResult,
    range: Range,
    end: number,
    mediumBaseline?: number | null,
  ) => void;
}

/** The temperature chart's left and right margins, so the years line up. */
const MARGIN: Margin = { top: 20, right: 16, bottom: 28, left: 48 };
const SSP_NAMES: Record<Ssp, string> = {
  ssp126: 'SSP1-2.6',
  ssp245: 'SSP2-4.5',
  ssp370: 'SSP3-7.0',
};

export interface PopulationLines {
  history: Point[];
  /** Each variant joined to the last estimate, the one chosen last so it is drawn on top. */
  variants: { variant: string; chosen: boolean; points: Point[] }[];
}

/** The lines within from..end, in billions. */
export const populationLines = (p: WorldPopulation, from: number, end: number): PopulationLines => {
  const billions = (points: Point[]) => points.map((q) => ({ ...q, value: q.value / 1e9 }));
  const history = billions(inRange(zipSeries(p.history.years, p.history.values), from, end));
  const last = zipSeries(p.history.years, p.history.values).at(-1);
  const joined = (s: { years: number[]; values: number[] }) =>
    billions(inRange([...(last ? [last] : []), ...zipSeries(s.years, s.values)], from, end));
  const variants = [...VARIANTS]
    .sort((a, b) => Number(a === p.variant) - Number(b === p.variant))
    .map((variant) => ({
      variant,
      chosen: !p.people && variant === p.variant,
      points: joined(p.variants[variant]),
    }));
  const people = p.people ? [{ variant: 'people', chosen: true, points: joined(p.people) }] : [];
  return { history, variants: [...variants, ...people] };
};

/**
 * How much the projection chosen moves the baseline in a year against the medium one, °C; null
 * with the medium projection, when the projection changes nothing, or without both values.
 */
export const baselineShift = (
  p: WorldPopulation,
  baseline: number | null,
  medium: number | null | undefined,
): number | null =>
  !moved(p) || baseline === null || medium === null || medium === undefined
    ? null
    : baseline - medium;

/** Whether the population differs from the medium projection where it acts. */
const moved = (p: WorldPopulation): boolean =>
  p.applies && (p.variant !== 'medium' || p.people !== undefined);

/**
 * The notes under the chart: how the variant pairs with the SSP, whether it acts at all, and how
 * far it moves the baseline (`shift`, already formatted).
 */
export const populationNotes = (
  p: WorldPopulation,
  t: T,
  shift?: { value: string; year: number },
): string[] => [
  ...(p.inconsistent
    ? [
        t('levers.population.chart.inconsistent', {
          variant: t(`levers.population.chart.variants.${p.variant}`),
          ssp: SSP_NAMES[p.ssp],
          direction: t(`levers.population.chart.${p.variant === 'low' ? 'larger' : 'smaller'}`),
        }),
      ]
    : []),
  ...(p.applies ? [] : [t('levers.population.chart.notApplied')]),
  ...(shift
    ? [t(`levers.population.chart.${p.people ? 'peopleShift' : 'baselineShift'}`, shift)]
    : []),
];

/** World population on the temperature chart's years: the history, then the UN's three variants. */
export const populationChart = (
  t: T,
  locale: string,
  currentYear: number,
  link?: HoverLink,
): PopulationChart => {
  const plotEl = h('div', {
    class: 'chart-plot',
    style: '--plot-h: 140px; --plot-h-narrow: 120px',
  });
  const caption = h('p', { class: 'chart-caption' }, t('levers.population.chart.caption'));
  const notes = h('p', { class: 'chart-caption population-note', role: 'note' });
  const el = h(
    'figure',
    { class: 'chart population-chart', hidden: true },
    h('h3', { class: 'chart-subtitle' }, t('levers.population.chart.title')),
    legendList([
      {
        label: t('levers.population.chart.history'),
        className: 'key-population-history',
        toggle: 'history',
      },
      {
        label: t('levers.population.chart.chosen'),
        className: 'key-population-chosen',
        toggle: 'chosen',
      },
      {
        label: t('levers.population.chart.others'),
        className: 'key-population-other',
        toggle: 'others',
      },
    ]),
    plotEl,
    h('figcaption', {}, caption, notes),
  );
  let last: [WorldPopulation, Range, number, number | null] | null = null;
  const draw = ([p, range, end, shift]: NonNullable<typeof last>) => {
    const from = RANGE_START[range];
    const narrow = (plotEl.clientWidth || 640) < 520;
    const f = frame(
      plotEl,
      narrow ? 120 : 140,
      MARGIN,
      t('levers.population.chart.label', { from, end }),
    );
    const lines = populationLines(p, from, end);
    const values = [
      0,
      ...lines.history.map((q) => q.value),
      ...lines.variants.flatMap((v) => v.points.map((q) => q.value)),
    ];
    const x = scaleLinear().domain([from, end]).range([0, f.innerWidth]);
    const y = scaleLinear()
      .domain([0, Math.max(...values)])
      .nice()
      .range([f.innerHeight, 0]);
    drawAxes(f, x, y, (v) => formatNumber(locale, v, 0), 3);
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -MARGIN.left + 4)
      .attr('y', -8)
      .text(t('levers.population.chart.unit'));
    const lineOf = line<Point>()
      .x((q) => x(q.year))
      .y((q) => y(q.value));
    lines.variants.forEach((v) =>
      f.plot
        .append('path')
        .datum(v.points)
        .attr('class', `line population-variant${v.chosen ? ' is-chosen' : ''}`)
        .attr('data-variant', v.variant)
        .attr('d', lineOf),
    );
    f.plot
      .append('path')
      .datum(lines.history)
      .attr('class', 'line population-history')
      .attr('d', lineOf);
    verticalRule(f, x(currentYear), String(currentYear));
    const valueAt = (points: Point[], year: number) => points.find((q) => q.year === year)?.value;
    const billion = (v: number) =>
      t('levers.population.chart.billion', { value: formatNumber(locale, v, 2) });
    addHover(
      plotEl,
      f,
      x,
      MARGIN,
      (year) => {
        const past = valueAt(lines.history, year);
        return past !== undefined
          ? [
              {
                label: t('levers.population.chart.history'),
                value: billion(past),
                swatch: 'var(--ink)',
                toggle: 'history',
              },
            ]
          : [...lines.variants].reverse().flatMap((v) => {
              const value = valueAt(v.points, year);
              return value === undefined
                ? []
                : [
                    {
                      label:
                        v.variant === 'people'
                          ? t('levers.population.chart.peopleLine')
                          : t('levers.population.chart.projection', {
                              variant: t(`levers.population.chart.variants.${v.variant}`),
                            }),
                      value: billion(value),
                      swatch: v.chosen ? 'var(--ink)' : 'var(--series-baseline)',
                      toggle: v.chosen ? 'chosen' : 'others',
                    },
                  ];
            });
      },
      t('chart.keys'),
      link && { link, id: 'population' },
    );
    const text = populationNotes(
      p,
      t,
      shift === null
        ? undefined
        : {
            value: formatTemperature(locale, shift, Math.abs(shift) < 0.1 ? 3 : 2, true),
            year: end,
          },
    ).join(' ');
    notes.textContent = text;
    notes.hidden = text === '';
  };
  const render = () => {
    if (last) {
      draw(last);
    }
  };
  onResize(plotEl, render);
  return {
    el,
    update: (result, range, end, mediumBaseline) => {
      const p = result.population ?? null;
      el.hidden = p === null;
      const tp = result.temperature;
      last = p
        ? [
            p,
            range,
            end,
            baselineShift(p, valueAt(tp.years, tp.baseline.median, end), mediumBaseline),
          ]
        : null;
      render();
    },
  };
};
