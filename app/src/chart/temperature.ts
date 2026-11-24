import { area, line, scaleLinear, type ScaleLinear, type Selection } from 'd3';
import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatNumber, formatTemperature } from '../i18n/format';
import type { BandSeries, Enso } from '../data/types';
import type { ScenarioResult } from '../model/api';
import type { Range } from '../app/url';
import { CURRENT_POLICIES, LEVELS, milestones, type Level } from '../app/milestones';
import {
  addHover,
  chartNotes,
  drawAxes,
  frame,
  type Frame,
  type HoverLink,
  type HoverRow,
  legendList,
  type Margin,
  onResize,
  verticalRule,
} from './frame';
import { ensoMarks, gapAt, inRange, zipBand, zipSeries, type EnsoMark } from './series';
import { drawPopulationArea, peoplePoints, populationRow, withAxis } from './populationArea';

export type { Range };
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

type Scale = ScaleLinear<number, number>;
type Temperature = ScenarioResult['temperature'];
interface Point {
  year: number;
  value: number;
}
interface BandPoint {
  year: number;
  lo: number;
  hi: number;
}

/** The chart's series on the years shown; the projections from the current year on. */
interface Shown {
  observed: Point[];
  baseMedian: Point[];
  scenMedian: Point[];
  baseBand: BandPoint[];
  scenBand: BandPoint[];
  naturalLine: Point[];
}

const shownSeries = (
  tp: Temperature,
  natural: BandSeries | undefined,
  from: number,
  end: number,
  currentYear: number,
): Shown => {
  const future = <P extends { year: number }>(points: P[]) =>
    inRange(points, from, end).filter((p) => p.year >= currentYear);
  return {
    observed: inRange(zipSeries(tp.years, tp.observed), from, end),
    baseMedian: inRange(zipSeries(tp.years, tp.baseline.median), from, end),
    scenMedian: future(zipSeries(tp.years, tp.scenario.median)),
    baseBand: future(zipBand(tp.years, tp.baseline.p05, tp.baseline.p95)),
    scenBand: future(zipBand(tp.years, tp.scenario.p05, tp.scenario.p95)),
    naturalLine: natural ? inRange(zipSeries(natural.years, natural.median), from, end) : [],
  };
};

/** Every value the y axis must hold: zero, the Paris levels, the policies band and the series. */
const yValues = (s: Shown, reaches2100: boolean): number[] => [
  0,
  ...LEVELS,
  ...(reaches2100 ? [CURRENT_POLICIES.high] : []),
  ...s.naturalLine.map((p) => p.value),
  ...s.observed.map((p) => p.value),
  ...s.baseBand.flatMap((p) => [p.lo, p.hi]),
  ...s.scenBand.flatMap((p) => [p.lo, p.hi]),
  ...s.baseMedian.map((p) => p.value),
];

/** The Paris Agreement's levels as labelled horizontal lines. */
const drawLevels = (f: Frame, y: Scale, t: T): void =>
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

/** The current-policies band at 2100, in the margin on the right. */
const drawPolicies = (f: Frame, y: Scale, t: T): void => {
  const g = f.plot.append('g').attr('class', 'policies');
  g.append('title').text(t('milestones.policies.full'));
  g.append('rect')
    .attr('x', f.innerWidth + 4)
    .attr('width', 8)
    .attr('y', y(CURRENT_POLICIES.high))
    .attr('height', Math.max(2, y(CURRENT_POLICIES.low) - y(CURRENT_POLICIES.high)));
};

/** The bands, the medians, natural factors alone and the observed line. */
const drawSeries = (f: Frame, x: Scale, y: Scale, s: Shown): void => {
  const bandArea = area<BandPoint>()
    .x((p) => x(p.year))
    .y0((p) => y(p.lo))
    .y1((p) => y(p.hi));
  const lineOf = line<Point>()
    .x((p) => x(p.year))
    .y((p) => y(p.value));
  f.plot.append('path').datum(s.baseBand).attr('class', 'band baseline-band').attr('d', bandArea);
  f.plot.append('path').datum(s.scenBand).attr('class', 'band scenario-band').attr('d', bandArea);
  f.plot.append('path').datum(s.scenMedian).attr('class', 'line scenario-line').attr('d', lineOf);
  f.plot.append('path').datum(s.baseMedian).attr('class', 'line baseline-line').attr('d', lineOf);
  if (s.naturalLine.length) {
    f.plot.append('path').datum(s.naturalLine).attr('class', 'line natural-line').attr('d', lineOf);
  }
  f.plot.append('path').datum(s.observed).attr('class', 'line observed-line').attr('d', lineOf);
};

const drawEnso = (f: Frame, x: Scale, y: Scale, marks: EnsoMark[], narrow: boolean): void => {
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
};

interface CrossingView {
  f: Frame;
  x: Scale;
  y: Scale;
  from: number;
  end: number;
  narrow: boolean;
}

/** A dot where a median crosses a level, labelled with its year unless the chart is narrow. */
const crossingDot = (
  v: CrossingView,
  g: Selection<SVGGElement, unknown, null, undefined>,
  level: number,
  year: number,
  className: string,
  dy: number,
): void => {
  const cx = v.x(year);
  g.append('circle')
    .attr('class', className)
    .attr('cx', cx)
    .attr('cy', v.y(level))
    .attr('r', 4)
    .append('title')
    .text(String(year));
  if (!v.narrow) {
    g.append('text')
      .attr('class', `${className}-label`)
      .attr('x', cx)
      .attr('y', v.y(level) + dy)
      .attr('text-anchor', anchorAt(cx, v.f.innerWidth))
      .text(String(year));
  }
};

/** The years each median crosses each level, where they fall on the years shown. */
const drawCrossings = (v: CrossingView, tp: Temperature, currentYear: number): void => {
  const shown = (year: number | null): year is number =>
    year !== null && year >= v.from && year <= v.end;
  milestones(tp, currentYear).levels.forEach((m) => {
    const g = v.f.plot.append('g').attr('class', 'crossings').attr('data-level', String(m.level));
    if (shown(m.baseline) && m.baseline !== m.scenario) {
      crossingDot(v, g, m.level, m.baseline, 'crossing-baseline', 15);
    }
    if (shown(m.scenario)) {
      crossingDot(v, g, m.level, m.scenario, 'crossing-scenario', -7);
    }
  });
};

/** The gap between the medians at the horizon, as text. */
const gapText = (locale: string, gap: number | null): string =>
  gap === null ? '–' : formatTemperature(locale, gap, Math.abs(gap) < 0.1 ? 3 : 2, true);

/** A bracket between the two medians at the horizon, with the gap. */
const drawGap = (f: Frame, x: Scale, y: Scale, s: Shown, end: number, text: string): void => {
  const [baseEnd, scenEnd] = [s.baseMedian.at(-1), s.scenMedian.at(-1)];
  if (baseEnd && scenEnd) {
    const g = f.plot.append('g').attr('class', 'gap-annotation');
    const [ya, yb] = [y(baseEnd.value), y(scenEnd.value)];
    const xr = x(end) - 6;
    g.append('path').attr('d', `M${xr - 4},${ya}H${xr}V${yb}H${xr - 4}`);
    g.append('text')
      .attr('x', xr - 8)
      .attr('y', Math.min(ya, yb) - 8)
      .attr('text-anchor', 'end')
      .text(text);
  }
};

/** A series' value in a year, formatted, or a dash. */
const valueIn = (locale: string, years: number[], values: (number | null)[], year: number) => {
  const v = values[years.indexOf(year)];
  return v === null || v === undefined ? '–' : formatTemperature(locale, v, 2);
};

/** The hover's rows in a year: observed, El Niño or La Niña, both medians, natural factors. */
const hoverRows =
  (
    t: T,
    locale: string,
    tp: Temperature,
    natural: BandSeries | undefined,
    marks: EnsoMark[],
    people: readonly Point[] = [],
  ) =>
  (year: number): HoverRow[] => {
    const at = (years: number[], values: (number | null)[]) => valueIn(locale, years, values, year);
    const enso = marks.filter((m) => m.year === year);
    return [
      {
        label: t('chart.observed'),
        value: at(tp.years, tp.observed),
        swatch: 'var(--ink)',
        toggle: 'observed',
      },
      ...enso.map((m) => ({
        label: t(`chart.enso.${m.phase}`),
        value: t('chart.enso.oni', { value: formatTemperature(locale, m.oni, 1, true) }),
        swatch: `var(--enso-${m.phase})`,
        toggle: 'enso',
      })),
      {
        label: t('chart.baseline'),
        value: at(tp.years, tp.baseline.median),
        swatch: 'var(--series-baseline)',
        toggle: 'baseline',
      },
      {
        label: t('chart.scenario'),
        value: at(tp.years, tp.scenario.median),
        swatch: 'var(--series-scenario)',
        toggle: 'scenario',
      },
      ...(natural
        ? [
            {
              label: t('chart.natural'),
              value: at(natural.years, natural.median),
              swatch: 'var(--series-natural)',
              toggle: 'natural',
            },
          ]
        : []),
      ...populationRow(t, locale, people, year),
    ];
  };

/** The current year, 2050 when the chart goes past it, and the horizon. */
const drawRules = (f: Frame, x: Scale, currentYear: number, end: number, apart = false): void => {
  const { left, right } = crowding(x, currentYear, end, apart);
  verticalRule(f, x(currentYear), String(currentYear), 'rule', left ? 'end' : undefined);
  if (end > 2050) {
    verticalRule(f, x(2050), left && right ? '' : '2050', 'rule', middleAnchor(left, right));
  }
  verticalRule(f, x(end), String(end));
};

/** px a year's label takes, at the rules' font size. */
const LABEL_WIDTH = 28;

/**
 * Whether 2050's label would run into the current year's (left) or the horizon's (right), each
 * pushed aside in turn; only beside the population area, which narrows the plot.
 */
const crowding = (x: Scale, currentYear: number, end: number, apart: boolean) => {
  const left = apart && x(2050) - x(currentYear) < LABEL_WIDTH + 4;
  const room = left ? 2 * LABEL_WIDTH + 4 : 1.5 * LABEL_WIDTH + 4;
  return { left, right: apart && end > 2050 && x(end) - x(2050) < room };
};

/** 2050's label: away from the one it is near. */
const middleAnchor = (left: boolean, right: boolean): 'start' | 'end' | undefined =>
  left ? 'start' : right ? 'end' : undefined;

/** The chart's size: narrow under 520 px, with room for the policies band when it reaches 2100. */
const layoutOf = (plotEl: HTMLElement, end: number) => {
  const narrow = (plotEl.clientWidth || 640) < 520;
  const reaches2100 = end >= 2100;
  return {
    narrow,
    reaches2100,
    margin: reaches2100 ? MARGIN_2100 : MARGIN,
    height: narrow ? 280 : 360,
  };
};

/** The notes on the Paris levels, and on the policies band and the population when drawn. */
const milestoneNotes = (t: T, reaches2100: boolean, population: boolean): string[] =>
  [
    t('milestones.caption'),
    reaches2100 ? t('milestones.policies.caption') : '',
    population ? t('levers.population.chart.caption') : '',
  ].filter(Boolean);

/** Hides a legend item, when the legend has it. */
const showItem = (item: HTMLElement | null, shown: boolean): void => {
  if (item) {
    item.hidden = !shown;
  }
};

/**
 * Observed line, baseline and scenario medians with 5–95% bands, the gap at the horizon, the
 * Paris Agreement's levels with the years each median crosses them, the current-policies band at
 * 2100, and, when the data has them, natural factors alone and dots on the observed line in El
 * Niño and La Niña years. Totals only: the causes of warming have their own chart.
 */
export const temperatureChart = (
  t: T,
  locale: string,
  currentYear: number,
  link?: HoverLink,
): TemperatureChart => {
  const plotEl = h('div', {
    class: 'chart-plot',
    style: '--plot-h: 360px; --plot-h-narrow: 280px',
    'data-loading': t('load.loading'),
  });
  const caption = h('p', { class: 'chart-caption' });
  const notes = chartNotes(t('chart.notes'), 'milestone-caption');
  const legend = legendList([
    { label: t('chart.observed'), className: 'key-observed', toggle: 'observed' },
    { label: t('chart.baseline'), className: 'key-baseline', toggle: 'baseline' },
    { label: t('chart.scenario'), className: 'key-scenario', toggle: 'scenario' },
    { label: t('chart.band'), className: 'key-band', toggle: 'band' },
    { label: t('chart.natural'), className: 'key-natural', toggle: 'natural' },
    { label: t('chart.enso.legend'), className: 'key-enso', toggle: 'enso' },
    { label: t('milestones.levels.short'), className: 'key-milestone', toggle: 'milestone' },
    { label: t('milestones.policies.short'), className: 'key-policies', toggle: 'policies' },
    {
      label: t('levers.population.chart.area'),
      className: 'key-population-area',
      toggle: 'population',
    },
  ]);
  const legendItem = (className: string) =>
    legend.querySelector(`.${className}`)?.closest('li') ?? null;
  const slot = h('div', { class: 'chart-slot' });
  const el = h(
    'figure',
    { class: 'chart temperature-chart' },
    legend,
    plotEl,
    h('figcaption', {}, caption, notes.el),
    slot,
  );
  let last: [ScenarioResult, Range, number, BandSeries | undefined, Enso | undefined] | null = null;
  const linked = link && { link, id: 'temperature' };
  const draw = ([result, range, end, natural, enso]: NonNullable<typeof last>) => {
    const tp = result.temperature;
    const from = RANGE_START[range];
    const { narrow, reaches2100, height, ...layout } = layoutOf(plotEl, end);
    const people = peoplePoints(result.population, from, end);
    const margin = withAxis(layout.margin, people, reaches2100);
    const f = frame(plotEl, height, margin, t('chart.label', { year: end }));
    const s = shownSeries(tp, natural, from, end, currentYear);
    const values = yValues(s, reaches2100);
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
    if (people.length > 0) {
      drawPopulationArea(f, x, people, locale, reaches2100);
    }
    drawLevels(f, y, t);
    if (reaches2100) {
      drawPolicies(f, y, t);
    }
    drawSeries(f, x, y, s);
    const marks = ensoMarks(enso, s.observed);
    drawEnso(f, x, y, marks, narrow);
    drawCrossings({ f, x, y, from, end, narrow }, tp, currentYear);
    drawRules(f, x, currentYear, end, people.length > 0);
    const gap = gapAt(tp.years, tp.baseline.median, tp.scenario.median, end);
    const gapValue = gapText(locale, gap);
    if (gap !== null) {
      drawGap(f, x, y, s, end, t('chart.gap', { value: gapValue, year: end }));
    }
    caption.textContent = t('chart.caption', { gap: gapValue, year: end });
    notes.set(milestoneNotes(t, reaches2100, people.length > 0));
    showItem(legendItem('key-natural'), s.naturalLine.length > 0);
    showItem(legendItem('key-enso'), marks.length > 0);
    showItem(legendItem('key-policies'), reaches2100);
    showItem(legendItem('key-population-area'), people.length > 0);
    addHover(
      plotEl,
      f,
      x,
      margin,
      hoverRows(t, locale, tp, natural, marks, people),
      t('chart.keys'),
      linked,
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
    update: (result, range, end, natural, enso) => {
      last = [result, range, end, natural, enso];
      render();
    },
    slot,
  };
};
