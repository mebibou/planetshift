import { area, line, scaleLinear } from 'd3';
import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatNumber } from '../i18n/format';
import type { Series, Ssp } from '../data/types';
import type { ScenarioResult } from '../model/api';
import type { SeaLevelBand, SeaLevelPaths } from '../model/seaLevel';
import { scenarioSentence, type Range } from './temperature';
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

/**
 * What a chart of a quantity without and with the levers draws: its strings under `keys`, the
 * paths in the run, the factor to the shown unit, the first year of each range and of the path
 * without the levers (the one with them starts now, when the levers can act), the digits of the
 * axis and of the hover, and whether the axis keeps zero.
 */
export interface PathsSpec {
  keys: 'seaLevelChart' | 'oceanChart';
  className: string;
  paths: (result: ScenarioResult) => SeaLevelPaths | undefined;
  scale: number;
  rangeFrom: Record<Range, number>;
  pathsFrom: number;
  axisDigits: number;
  valueDigits: number;
  withZero: boolean;
}

/** The sea level since 1900: the fit emulates AR6 for this century, not the history before it. */
export const SEA_LEVEL: PathsSpec = {
  keys: 'seaLevelChart',
  className: 'sea-level-chart',
  paths: (r) => r.seaLevel,
  scale: 100,
  rangeFrom: { full: 1900, recent: 2000 },
  pathsFrom: 2000,
  axisDigits: 0,
  valueDigits: 1,
  withZero: true,
};

/** The surface ocean's pH, from FaIR's CO₂ since 1850. */
export const OCEAN_PH: PathsSpec = {
  keys: 'oceanChart',
  className: 'ocean-chart',
  paths: (r) => r.ocean,
  scale: 1,
  rangeFrom: { full: 1850, recent: 2000 },
  pathsFrom: 1850,
  axisDigits: 2,
  valueDigits: 3,
  withZero: false,
};

export interface PathsChart {
  el: HTMLElement;
  update: (result: ScenarioResult, end: number, range: Range, observed?: Series, ssp?: Ssp) => void;
}

/** A path's median and likely band in the shown unit, from `from` to `end`. */
const shown = (years: number[], band: SeaLevelBand, scale: number, from: number, end: number) => {
  const scaled = (values: number[]) => values.map((v) => v * scale);
  return {
    median: inRange(zipSeries(years, scaled(band.median)), from, end),
    band: inRange(zipBand(years, scaled(band.low), scaled(band.high)), from, end),
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

/** A row of the hover, or none when the year is outside the line. */
const rowIf = (shownHere: boolean, row: HoverRow): HoverRow[] => (shownHere ? [row] : []);

/** A quantity each year to the horizon: observed, modelled, and modelled with levers. */
export const pathsChart = (
  t: T,
  locale: string,
  currentYear: number,
  spec: PathsSpec,
): PathsChart => {
  const k = (key: string, values?: Record<string, string | number>) =>
    t(`${spec.keys}.${key}`, values);
  const plotEl = h('div', {
    class: 'chart-plot',
    style: '--plot-h: 340px; --plot-h-narrow: 260px',
    'data-loading': t('load.loading'),
  });
  const caption = h('p', { class: 'chart-caption' }, k('caption'));
  const el = h(
    'figure',
    { class: `chart ${spec.className}` },
    legendList([
      { label: t('chart.observed'), className: 'key-observed', toggle: 'observed' },
      { label: t('chart.baseline'), className: 'key-baseline', toggle: 'baseline' },
      { label: t('chart.scenario'), className: 'key-scenario', toggle: 'scenario' },
      { label: k('band'), className: 'key-band', toggle: 'band' },
    ]),
    plotEl,
    h('figcaption', {}, caption),
  );
  let last: [ScenarioResult, number, Range, Series | undefined, Ssp | undefined] | null = null;
  const draw = ([result, end, range, observedSeries, ssp]: NonNullable<typeof last>) => {
    caption.textContent = [k('caption'), scenarioSentence(t, ssp)].filter(Boolean).join(' ');
    const paths = spec.paths(result);
    if (!paths) {
      return;
    }
    const from = spec.rangeFrom[range];
    const base = shown(
      paths.years,
      paths.baseline,
      spec.scale,
      Math.max(from, spec.pathsFrom),
      end,
    );
    const scen = shown(paths.years, paths.scenario, spec.scale, currentYear, end);
    const observed = observedSeries
      ? inRange(
          zipSeries(
            observedSeries.years,
            observedSeries.values.map((v) => v * spec.scale),
          ),
          from,
          end,
        )
      : [];
    const narrow = (plotEl.clientWidth || 640) < 520;
    const margin = tightened(MARGIN, isTight(plotEl));
    const f = frame(plotEl, narrow ? 260 : 340, margin, k('label', { year: end }));
    const values = [
      ...[...base.band, ...scen.band].flatMap((p) => [p.lo, p.hi]),
      ...observed.map((p) => p.value as number),
      ...(spec.withZero ? [0] : []),
    ];
    const x = scaleLinear().domain([from, end]).range([0, f.innerWidth]);
    const y = scaleLinear()
      .domain([Math.min(...values), Math.max(...values)])
      .nice()
      .range([f.innerHeight, 0]);
    drawAxes(f, x, y, (v) => formatNumber(locale, v, spec.axisDigits));
    f.plot
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', -margin.left + 4)
      .attr('y', -10)
      .text(k('unit'));
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
    const text = (v: number | null | undefined) =>
      v === undefined || v === null
        ? '–'
        : k('value', { value: formatNumber(locale, v, spec.valueDigits) });
    const at = (band: SeaLevelBand, year: number) => {
      const v = band.median[paths.years.indexOf(year)];
      return v === undefined ? undefined : v * spec.scale;
    };
    addHover(
      plotEl,
      f,
      x,
      margin,
      (year) => [
        ...rowIf(
          observed.some((p) => p.year === year),
          {
            label: t('chart.observed'),
            value: text(observed.find((p) => p.year === year)?.value),
            swatch: 'var(--series-observed)',
            toggle: 'observed',
          },
        ),
        ...rowIf(year >= spec.pathsFrom, {
          label: t('chart.baseline'),
          value: text(at(paths.baseline, year)),
          swatch: 'var(--series-baseline)',
          toggle: 'baseline',
        }),
        ...rowIf(year >= currentYear, {
          label: t('chart.scenario'),
          value: text(at(paths.scenario, year)),
          swatch: 'var(--series-scenario)',
          toggle: 'scenario',
        }),
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
    update: (result, end, range, observed, ssp) => {
      last = [result, end, range, observed, ssp];
      render();
    },
  };
};
