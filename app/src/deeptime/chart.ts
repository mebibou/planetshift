import { area, axisLeft, easeCubicInOut, line, scaleLinear, timer, type Timer } from 'd3';
import { h } from '../app/dom';
import { frame, onResize, type Frame, type Margin } from '../chart/frame';
import { EVENTS, PARIS_LEVELS } from './events';
import {
  between,
  clampView,
  END_YEAR,
  fractionOf,
  panBy,
  placed,
  sameView,
  ticksOf,
  unitOf,
  yearAt,
  zoomAt,
  type Tick,
  type Unit,
  type View,
} from './scale';
import { extentOf, inView, readout, type Line, type Point, type SeriesId } from './series';

export interface ChartTexts {
  label: (v: View) => string;
  axis: Record<Unit, string>;
  yAxis: string;
  tick: (t: Tick, unit: Unit) => string;
  formatY: (v: number) => string;
  event: (id: string) => string;
  paris: (level: number) => string;
  end: (which: 'baseline' | 'scenario' | 'same', value: number) => string;
  keys: string;
  /** The hover's year, worded for a window `span` years wide. */
  hoverYear: (year: number, span: number) => string;
  series: (id: SeriesId) => string;
  value: (p: Point) => string;
}

export interface DeepTimeChart {
  draw: (lines: Line[], end: { baseline: number; scenario: number } | null) => void;
  go: (v: View) => void;
  zoom: (factor: number) => void;
  pan: (by: number) => void;
  destroy: () => void;
}

const MARGIN: Margin = { top: 30, right: 12, bottom: 40, left: 44 };
const ANIMATION_MS = 700;

type Px = (year: number) => number;
type Scale = ReturnType<typeof scaleLinear<number, number>>;

const drawYAxis = (f: Frame, y: Scale, formatY: (v: number) => string) => {
  f.plot
    .append('g')
    .attr('class', 'grid')
    .call(
      axisLeft(y)
        .ticks(6)
        .tickSize(-f.innerWidth)
        .tickFormat(() => ''),
    )
    .call((g) => g.select('.domain').remove());
  f.plot
    .append('g')
    .attr('class', 'axis axis-y')
    .call(
      axisLeft(y)
        .ticks(6)
        .tickFormat((d) => formatY(Number(d)))
        .tickSize(0)
        .tickPadding(6),
    )
    .call((g) => g.select('.domain').remove());
};

const drawXAxis = (f: Frame, v: View, x: Px, texts: ChartTexts, present: number) => {
  const unit = unitOf(v);
  const g = f.plot
    .append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${f.innerHeight})`);
  g.append('line').attr('x1', 0).attr('x2', f.innerWidth).attr('class', 'domain-line');
  const count = Math.max(3, Math.floor(f.innerWidth / 90));
  ticksOf(v, count, present).forEach((t) => {
    const tick = g.append('g').attr('transform', `translate(${x(t.year)},0)`);
    tick.append('line').attr('y2', 5);
    tick.append('text').attr('y', 17).attr('text-anchor', 'middle').text(texts.tick(t, unit));
  });
  f.plot
    .append('text')
    .attr('class', 'axis-title deeptime-axis-title')
    .attr('x', f.innerWidth / 2)
    .attr('y', f.innerHeight + 34)
    .attr('text-anchor', 'middle')
    .text(texts.axis[unit]);
  f.plot
    .append('text')
    .attr('class', 'axis-title')
    .attr('x', -MARGIN.left + 2)
    .attr('y', -14)
    .text(texts.yAxis);
};

const drawLines = (f: Frame, lines: Line[], v: View, x: Px, y: Scale) => {
  const plot = f.plot.append('g').attr('clip-path', 'url(#deeptime-clip)');
  const band = area<Point>()
    .defined((p) => p.lo !== undefined && p.hi !== undefined)
    .x((p) => x(p.year))
    .y0((p) => y(p.lo!))
    .y1((p) => y(p.hi!));
  const path = line<Point>()
    .x((p) => x(p.year))
    .y((p) => y(p.mid));
  lines.forEach((l) => {
    const shown = inView(l.points, v);
    if (shown.some((p) => p.lo !== undefined)) {
      plot.append('path').datum(shown).attr('class', `band deeptime-band-${l.id}`).attr('d', band);
    }
  });
  lines.forEach((l) => {
    plot
      .append('path')
      .datum(inView(l.points, v))
      .attr('class', `line deeptime-line-${l.id}`)
      .attr('data-series', l.id)
      .attr('d', path);
  });
};

const drawParis = (f: Frame, y: Scale, texts: ChartTexts) =>
  PARIS_LEVELS.forEach((level) => {
    const g = f.plot.append('g').attr('class', 'milestone');
    g.append('line')
      .attr('x1', 0)
      .attr('x2', f.innerWidth)
      .attr('y1', y(level))
      .attr('y2', y(level));
    g.append('text')
      .attr('x', 4)
      .attr('y', y(level) - 4)
      .text(texts.paris(level));
  });

/** The markers in the window, a line each; their names are in the panel beside the chart. */
const drawEvents = (f: Frame, v: View, x: Px, texts: ChartTexts) =>
  EVENTS.filter((e) => e.year >= v.start && e.year <= v.end).forEach((e) => {
    const cx = x(e.year);
    const g = f.plot
      .append('g')
      .attr('class', `deeptime-event deeptime-event-${e.kind}`)
      .attr('data-event', e.id);
    g.append('title').text(texts.event(e.id));
    g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', -4).attr('y2', f.innerHeight);
    g.append('circle').attr('cx', cx).attr('cy', -4).attr('r', 3.5);
  });

const drawEnd = (
  f: Frame,
  x: Px,
  y: Scale,
  end: { baseline: number; scenario: number },
  texts: ChartTexts,
) => {
  const cx = x(END_YEAR);
  const same = Math.abs(end.baseline - end.scenario) < 0.05;
  const marks: ['baseline' | 'scenario' | 'same', number, number][] = same
    ? [['same', end.baseline, 0]]
    : [
        ['baseline', end.baseline, end.baseline >= end.scenario ? -6 : 14],
        ['scenario', end.scenario, end.baseline >= end.scenario ? 14 : -6],
      ];
  marks.forEach(([which, value, dy]) => {
    const g = f.plot.append('g').attr('class', `deeptime-end deeptime-end-${which}`);
    g.append('circle').attr('cx', cx).attr('cy', y(value)).attr('r', 4);
    g.append('text')
      .attr('x', cx - 8)
      .attr('y', y(value) + (dy || 4))
      .attr('text-anchor', 'end')
      .text(texts.end(which, value));
  });
};

/** The fraction across the plot of a pointer's clientX. */
const fractionAt = (f: Frame, clientX: number): number => {
  const box = f.svg.node()!.getBoundingClientRect();
  const scale = box.width > 0 ? box.width / f.width : 1;
  const fraction = ((clientX - box.left) / scale - MARGIN.left) / f.innerWidth;
  return Math.min(1, Math.max(0, fraction));
};

/** The hover's tooltip: the year, then each series that covers it with its value. */
const tipContent = (texts: ChartTexts, lines: Line[], year: number, span: number) => [
  h('strong', {}, texts.hoverYear(year, span)),
  h(
    'dl',
    {},
    ...readout(lines, year).flatMap(({ id, point }) => [
      h('dt', {}, h('span', { class: `key deeptime-key-${id}` }), texts.series(id)),
      h('dd', {}, texts.value(point)),
    ]),
  ),
];

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const KEYS: Record<string, (c: DeepTimeChart) => void> = {
  ArrowLeft: (c) => c.pan(0.2),
  ArrowRight: (c) => c.pan(-0.2),
  ArrowUp: (c) => c.zoom(0.5),
  ArrowDown: (c) => c.zoom(2),
  '+': (c) => c.zoom(0.5),
  '=': (c) => c.zoom(0.5),
  '-': (c) => c.zoom(2),
};

/**
 * The zoomable chart: the wheel and a pinch zoom around the pointer, a drag pans, the arrow keys
 * pan (left, right) and zoom (up, down, + and −). `onView` hears each window drawn.
 */
export const deepTimeChart = (
  el: HTMLElement,
  texts: ChartTexts,
  start: View,
  present: number,
  onView: (v: View) => void,
): DeepTimeChart => {
  let view = clampView(start);
  let lines: Line[] = [];
  let end: { baseline: number; scenario: number } | null = null;
  let f: Frame | null = null;
  let running: Timer | null = null;
  let queued = 0;
  const pointers = new Map<number, number>();
  const tip = h('div', { class: 'tooltip chart-tooltip deeptime-tip', hidden: true });
  el.append(tip);
  let gesture: { view: View; year: number; fraction: number; distance: number } | null = null;

  const render = () => {
    queued = 0;
    const height = el.clientWidth < 600 ? 320 : 400;
    f = frame(el, height, MARGIN, texts.label(view));
    f.svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'deeptime-clip')
      .append('rect')
      .attr('width', f.innerWidth)
      .attr('height', f.innerHeight);
    const width = f.innerWidth;
    const x: Px = (year) => fractionOf(view, year) * width;
    const y = scaleLinear().domain(extentOf(lines, view)).nice().range([f.innerHeight, 0]);
    drawYAxis(f, y, texts.formatY);
    drawXAxis(f, view, x, texts, present);
    drawParis(f, y, texts);
    drawEvents(f, view, x, texts);
    drawLines(f, lines, view, x, y);
    if (end && view.end >= END_YEAR - 1) {
      drawEnd(f, x, y, end, texts);
    }
    el.dataset.unit = unitOf(view);
    onView(view);
  };
  const hide = () => {
    tip.hidden = true;
    f?.plot.select('.crosshair').remove();
  };
  /** The values under the pointer: a crosshair, and the tooltip beside it, kept inside the chart. */
  const hover = (clientX: number) => {
    const frameNow = f!;
    const fraction = fractionAt(frameNow, clientX);
    const year = yearAt(view, fraction);
    const cx = fraction * frameNow.innerWidth;
    frameNow.plot.select('.crosshair').remove();
    frameNow.plot
      .append('line')
      .attr('class', 'crosshair')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', 0)
      .attr('y2', frameNow.innerHeight);
    tip.replaceChildren(...tipContent(texts, lines, year, view.end - view.start));
    tip.hidden = false;
    const box = el.getBoundingClientRect();
    const left = clientX - box.left + 14;
    tip.style.left = `${Math.max(0, Math.min(left, box.width - tip.offsetWidth))}px`;
    tip.style.top = `${MARGIN.top}px`;
  };
  const schedule = () => {
    queued ||= requestAnimationFrame(render);
  };
  const set = (v: View) => {
    view = clampView(v);
    schedule();
  };
  const stop = () => {
    running?.stop();
    running = null;
  };

  const chart: DeepTimeChart = {
    draw: (next, nextEnd) => {
      lines = next;
      end = nextEnd;
      render();
    },
    go: (target) => {
      stop();
      if (reducedMotion() || sameView(view, target)) {
        set(target);
        return;
      }
      const path = between(view, target);
      running = timer((elapsed) => {
        const k = Math.min(1, elapsed / ANIMATION_MS);
        set(path(easeCubicInOut(k)));
        if (k === 1) {
          stop();
        }
      });
    },
    zoom: (factor) => {
      stop();
      set(zoomAt(view, yearAt(view, 0.5), factor));
    },
    pan: (by) => {
      stop();
      set(panBy(view, by));
    },
    destroy: () => {
      stop();
      cancelAnimationFrame(queued);
      el.removeEventListener('wheel', onWheel);
      el.replaceChildren();
    },
  };

  const onWheel = (e: WheelEvent) => {
    if (!f) {
      return;
    }
    e.preventDefault();
    stop();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    set(zoomAt(view, yearAt(view, fractionAt(f, e.clientX)), Math.exp(delta * 0.002)));
  };
  const begin = () => {
    const xs = [...pointers.values()];
    const fractions = xs.map((cx) => fractionAt(f!, cx));
    const fraction = fractions.reduce((a, b) => a + b, 0) / fractions.length;
    gesture = {
      view,
      year: yearAt(view, fraction),
      fraction,
      distance: xs.length > 1 ? Math.abs(xs[0]! - xs[1]!) : 0,
    };
  };
  const move = () => {
    const xs = [...pointers.values()];
    const g = gesture!;
    const fraction = xs.map((cx) => fractionAt(f!, cx)).reduce((a, b) => a + b, 0) / xs.length;
    const factor =
      xs.length > 1 && g.distance > 0 ? g.distance / Math.max(1, Math.abs(xs[0]! - xs[1]!)) : 1;
    const zoomed = zoomAt(g.view, g.year, factor);
    set(placed(zoomed.end - zoomed.start, g.year, fraction));
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  onResize(el, schedule);
  el.onpointerdown = (e) => {
    if (!f || e.button > 0) {
      return;
    }
    stop();
    el.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, e.clientX);
    begin();
  };
  el.onpointermove = (e) => {
    if (pointers.has(e.pointerId) && f) {
      pointers.set(e.pointerId, e.clientX);
      hide();
      move();
    } else if (f && e.pointerType === 'mouse') {
      hover(e.clientX);
    }
  };
  el.onpointerleave = hide;
  el.onpointerup = el.onpointercancel = (e) => {
    pointers.delete(e.pointerId);
    gesture = null;
    if (pointers.size > 0) {
      begin();
    }
  };
  el.tabIndex = 0;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', texts.keys);
  el.onkeydown = (e) => {
    const act = KEYS[e.key];
    if (act) {
      e.preventDefault();
      act(chart);
    }
  };
  return chart;
};
