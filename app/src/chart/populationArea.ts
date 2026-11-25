import { area, axisRight, scaleLinear, type ScaleLinear } from 'd3';
import { formatNumber } from '../i18n/format';
import type { T } from '../i18n/i18n';
import type { WorldPopulation } from '../levers/population/model';
import type { Frame, HoverRow, Margin } from './frame';
import { inRange, zipSeries, type Point } from './series';

/**
 * World population as a light area behind the temperature lines, on an axis in billions on the
 * right: the people-on-Earth path when one is set, else the UN projection in use.
 */

/** Room on the right for the axis, past the current-policies band when it is drawn. */
const AXIS_WIDTH = 34;
const AXIS_WIDTH_TIGHT = 26;
const POLICIES_WIDTH = 14;
/** The people slider's top, so the axis does not move between the UN path and the slider. */
export const PEOPLE_AXIS_MAX = 14;

const ahead = (p: WorldPopulation) => p.people ?? p.variants[p.variant];

/** People by year: the estimates, then the people-on-Earth path, else the UN projection in use. */
export const populationPath = (p: WorldPopulation): Point[] => [
  ...zipSeries(p.history.years, p.history.values),
  ...zipSeries(ahead(p).years, ahead(p).values),
];

/** Billions in from..end. */
export const peoplePoints = (
  p: WorldPopulation | null | undefined,
  from: number,
  end: number,
): Point[] =>
  p ? inRange(populationPath(p), from, end).map((q) => ({ ...q, value: q.value / 1e9 })) : [];

/** The margin with room for the axis on the right, or as it was without an area. */
export const withAxis = (
  margin: Margin,
  points: readonly Point[],
  reaches2100: boolean,
  tight = false,
): Margin =>
  points.length > 0
    ? {
        ...margin,
        right: (reaches2100 ? POLICIES_WIDTH : 0) + (tight ? AXIS_WIDTH_TIGHT : AXIS_WIDTH),
      }
    : margin;

/** The area from zero, inserted first so it sits behind everything, and its axis. */
export const drawPopulationArea = (
  f: Frame,
  x: ScaleLinear<number, number>,
  points: readonly Point[],
  locale: string,
  reaches2100: boolean,
): void => {
  const y = scaleLinear()
    .domain([0, Math.max(PEOPLE_AXIS_MAX, ...points.map((q) => q.value))])
    .range([f.innerHeight, 0]);
  f.plot
    .insert('path', ':first-child')
    .datum(points)
    .attr('class', 'population-area')
    .attr(
      'd',
      area<Point>()
        .x((q) => x(q.year))
        .y0(f.innerHeight)
        .y1((q) => y(q.value)),
    );
  f.plot
    .append('g')
    .attr('class', 'axis population-axis')
    .attr('transform', `translate(${f.innerWidth + (reaches2100 ? POLICIES_WIDTH : 0)},0)`)
    .call(
      axisRight(y)
        .ticks(4)
        .tickFormat((d) => formatNumber(locale, Number(d), 0))
        .tickSize(0)
        .tickPadding(4),
    )
    .call((g) => g.select('.domain').remove());
};

/** The hover's row for the population in a year, if the area has one. */
export const populationRow = (
  t: T,
  locale: string,
  points: readonly Point[],
  year: number,
): HoverRow[] => {
  const q = points.find((p) => p.year === year);
  return q
    ? [
        {
          label: t('levers.population.chart.area'),
          value: t('levers.population.chart.billion', { value: formatNumber(locale, q.value, 2) }),
          swatch: 'var(--series-population)',
          toggle: 'population',
        },
      ]
    : [];
};
