import { area, line, scaleLinear } from 'd3';
import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatNumber } from '../i18n/format';
import type { Series } from '../data/types';
import type { ScenarioResult } from '../model/api';
import type { Range } from './temperature';
import type { SeaLevelBand } from '../model/seaLevel';
import {
  addHover,
  drawAxes,
  frame,
  isTight,
  legendList,
  onResize,
  tightened,
  verticalRule,
  type Frame,
  type HoverRow,
  type Margin,
} from './frame';
import { inRange, zipBand, zipSeries, type BandPoint, type Point } from './series';

const MARGIN: Margin = { top: 24, right: 16, bottom: 28, left: 56 };
/** The first year of each range: the observed record starts in 1900. */
const RANGE_FROM: Record<Range, number> = { full: 1900, recent: 2000 };
/** The path without the levers starts here: the fit emulates AR6 for this century, not the history before it; the one with them starts now, when the levers can act. */
const PATHS_FROM = 2000;

export interface SeaLevelChart {
  el: HTMLElement;
  update: (result: ScenarioResult, end: number, range: Range, observed?: Series) => void;
}

/** A path's median and likely band in cm, from `from` to `end`. */
const inCm = (years: number[], band: SeaLevelBand, from: number, end: number) => {
  const cm = (values: number[]) => values.map((v) => v * 100);
  return {
    median: inRange(zipSeries(years, cm(band.median)), from, end),
    band: inRange(zipBand(years, cm(band.low), cm(band.high)), from, end),
  };
};

const drawPath = (
  f: Frame,
  path: { median: Point[]; band: BandPoint[] },
  x: (v: number) => number,
  y: (v: number) => number,
  kind: 'baseline' | 'scenario',
) => {
  f.plot
    .append('path')
    .datum(path.band)
    .attr('class', `band ${kind}-band`)
    .attr(
      'd',
      area<BandPoint>()
        .x((p) => x(p.year))
        .y0((p) => y(p.lo))
        .y1((p) => y(p.hi)),
    );
  f.plot
    .append('path')
    .datum(path.median)
    .attr('class', `line ${kind}-line`)
    .attr(
      'd',
      line<Point>()
        .x((p) => x(p.year))
        .y((p) => y(p.value as number)),
    );
};

/** The observed level in a year, as a hover row, when the record has it. */
const observedRow = (t: T, locale: string, observed: Point[], year: number): HoverRow[] => {
  const v = observed.find((p) => p.year === year)?.value;
  return v === undefined || v === null
    ? []
    : [
        {
          label: t('chart.observed'),
          value: t('seaLevelChart.value', { value: formatNumber(locale, v, 1) }),
          swatch: 'var(--series-observed)',
          toggle: 'observed',
        },
      ];
};

/** The sea-level rise each year to the horizon without and with the levers, with their likely ranges. */
export const seaLevelChart = (t: T, locale: string, currentYear: number): SeaLevelChart => {
  const plotEl = h('div', {
    class: 'chart-plot',
    style: '--plot-h: 340px; --plot-h-narrow: 260px',
    'data-loading': t('load.loading'),
  });
  const el = h(
    'figure',
    { class: 'chart sea-level-chart' },
    legendList([
      { label: t('chart.observed'), className: 'key-observed', toggle: 'observed' },
      { label: t('chart.baseline'), className: 'key-baseline', toggle: 'baseline' },
      { label: t('chart.scenario'), className: 'key-scenario', toggle: 'scenario' },
      { label: t('seaLevelChart.band'), className: 'key-band', toggle: 'band' },
    ]),
    plotEl,
    h('figcaption', {}, h('p', { class: 'chart-caption' }, t('seaLevelChart.caption'))),
  );
  let last: [ScenarioResult, number, Range, Series | undefined] | null = null;
  const draw = ([result, end, range, observedSeries]: NonNullable<typeof last>) => {
    const sea = result.seaLevel;
    if (!sea) {
      return;
    }
    const from = RANGE_FROM[range];
    const base = inCm(sea.years, sea.baseline, PATHS_FROM, end);
    const scen = inCm(sea.years, sea.scenario, currentYear, end);
    const observed = observedSeries
      ? inRange(
          zipSeries(
            observedSeries.years,
            observedSeries.values.map((v) => v * 100),
          ),
          from,
          end,
        )
      : [];
    const narrow = (plotEl.clientWidth || 640) < 520;
    const margin = tightened(MARGIN, isTight(plotEl));
    const f = frame(plotEl, narrow ? 260 : 340, margin, t('seaLevelChart.label', { year: end }));
    const values = [
      ...[...base.band, ...scen.band].flatMap((p) => [p.lo, p.hi]),
      ...observed.map((p) => p.value as number),
    ];
    const x = scaleLinear().domain([from, end]).range([0, f.innerWidth]);
    const y = scaleLinear()
      .domain([Math.min(0, ...values), Math.max(...values)])
      .nice()
      .range([f.innerHeight, 0]);
    drawAxes(f, x, y, (v) => formatNumber(locale, v, 0));
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -margin.left + 4)
      .attr('y', -10)
      .text(t('seaLevelChart.unit'));
    verticalRule(f, x(currentYear), String(currentYear));
    drawPath(f, base, x, y, 'baseline');
    drawPath(f, scen, x, y, 'scenario');
    f.plot
      .append('path')
      .datum(observed)
      .attr('class', 'line observed-line')
      .attr(
        'd',
        line<Point>()
          .x((p) => x(p.year))
          .y((p) => y(p.value as number)),
      );
    const at = (band: SeaLevelBand, year: number) => band.median[sea.years.indexOf(year)];
    const cm = (v: number | undefined) =>
      v === undefined ? '–' : t('seaLevelChart.value', { value: formatNumber(locale, v * 100, 1) });
    addHover(
      plotEl,
      f,
      x,
      margin,
      (year) => [
        ...observedRow(t, locale, observed, year),
        ...(year < PATHS_FROM
          ? []
          : [
              {
                label: t('chart.baseline'),
                value: cm(at(sea.baseline, year)),
                swatch: 'var(--series-baseline)',
                toggle: 'baseline',
              },
            ]),
        ...(year < currentYear
          ? []
          : [
              {
                label: t('chart.scenario'),
                value: cm(at(sea.scenario, year)),
                swatch: 'var(--series-scenario)',
                toggle: 'scenario',
              },
            ]),
      ],
      t('chart.keys'),
    );
  };
  const render = () => {
    if (last) {
      draw(last);
    }
  };
  onResize(plotEl, render);
  return {
    el,
    update: (result, end, range, observed) => {
      last = [result, end, range, observed];
      render();
    },
  };
};
