import { axisBottom, scaleLinear, type ScaleLinear } from 'd3';
import { h } from '../app/dom';
import type { WasteView } from '../app/url';
import type { OceanPlastic, SolidWaste } from '../data/types';
import { formatMass, formatPercent } from '../i18n/format';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
import { frame, isTight, legendList, onResize, tightened, type Frame, type Margin } from './frame';
import { barTotal, oceanPlasticTotal, wasteBars, type WasteBar } from './wasteBars';

const MARGIN: Margin = { top: 8, right: 16, bottom: 28, left: 16 };
/** Each bar's row: its label above it, the bar, and the space before the next. */
const ROW = 56;
const LABEL_Y = 13;
const BAR_Y = 20;
const BAR_H = 22;
/** The surface gap between two parts of a bar, px. */
const GAP = 2;

export interface WasteInput {
  result: ScenarioResult;
  view: WasteView;
  solidwaste: SolidWaste | undefined;
  oceanplastic: OceanPlastic | undefined;
}

export interface WasteChart {
  el: HTMLElement;
  update: (input: WasteInput) => void;
}

/** The i18n prefix of a view's parts and of its bars. */
const PART_TEXTS: Record<WasteView, string> = {
  food: 'waste.stages',
  types: 'waste.types',
  treatment: 'waste.treatments',
};

const colourOf = (i: number): string => `var(--waste-${i + 1})`;

/** Each part's left edge and width on the scale, with the surface gap after it. */
const segments = (bar: WasteBar, x: ScaleLinear<number, number>) =>
  bar.parts.reduce<{ at: number; out: { key: string; tonnes: number; x: number; w: number }[] }>(
    (acc, p) => {
      const [x0, x1] = [x(acc.at), x(acc.at + p.tonnes)];
      return {
        at: acc.at + p.tonnes,
        out: [...acc.out, { ...p, x: x0, w: Math.max(0, x1 - x0 - GAP) }],
      };
    },
    { at: 0, out: [] },
  ).out;

const drawAxis = (f: Frame, x: ScaleLinear<number, number>, locale: string) => {
  const ticks = Math.max(2, Math.min(6, Math.floor(f.innerWidth / 110)));
  f.plot
    .append('g')
    .attr('class', 'gridlines')
    .call(
      axisBottom(x)
        .ticks(ticks)
        .tickSize(f.innerHeight)
        .tickFormat(() => ''),
    )
    .call((g) => g.select('.domain').remove());
  f.plot
    .append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${f.innerHeight})`)
    .call(
      axisBottom(x)
        .ticks(ticks)
        .tickFormat((d) => (Number(d) === 0 ? '0' : formatMass(locale, Number(d) * 1000)))
        .tickSizeOuter(0),
    );
};

/** One bar: its label and total above it, then its parts, each with its name in a title. */
const drawBar = (
  f: Frame,
  x: ScaleLinear<number, number>,
  bar: WasteBar,
  i: number,
  text: { bar: string; part: (key: string) => string; locale: string },
) => {
  const total = barTotal(bar);
  const g = f.plot
    .append('g')
    .attr('class', 'waste-bar')
    .attr('transform', `translate(0,${i * ROW})`);
  g.append('text')
    .attr('class', 'waste-bar-label')
    .attr('y', LABEL_Y)
    .text(`${text.bar} · ${formatMass(text.locale, total * 1000)}`);
  segments(bar, x).forEach((s, k) =>
    g
      .append('rect')
      .attr('class', 'waste-part')
      .attr('x', s.x)
      .attr('y', BAR_Y)
      .attr('width', s.w)
      .attr('height', BAR_H)
      .attr('rx', 2)
      .style('fill', colourOf(k))
      .append('title')
      .text(
        `${text.part(s.key)}: ${formatMass(text.locale, s.tonnes * 1000)} (${formatPercent(text.locale, total > 0 ? s.tonnes / total : 0)})`,
      ),
  );
};

/** The legend of a view's parts, in their stacking order and colours. */
const legendOf = (t: T, prefix: string, bars: readonly WasteBar[]): HTMLElement =>
  legendList(
    (bars[0]?.parts ?? []).map((p, k) => ({
      label: t(`${prefix}.${p.key}`),
      className: `key-waste-${k + 1}`,
    })),
  );

/** A line across the middle of the plot when it has nothing to draw. */
const drawEmpty = (f: Frame, text: string) => {
  if (text) {
    f.plot
      .append('text')
      .attr('class', 'chart-empty')
      .attr('x', f.innerWidth / 2)
      .attr('y', f.innerHeight / 2)
      .text(text);
  }
};

/** The world's plastic reaching the ocean, which the chart does not stack; '' without the file. */
const plasticLine = (t: T, locale: string, file: OceanPlastic | undefined): string => {
  const ocean = oceanPlasticTotal(file);
  return ocean === null || !file
    ? ''
    : t('wasteChart.plastic', { mass: formatMass(locale, ocean * 1000), year: file.year });
};

/**
 * The world's waste as stacked bars: food lost and wasted by stage, today and with the levers,
 * or municipal solid waste by type or treatment, for the world and each income group.
 */
export const wasteChart = (t: T, locale: string): WasteChart => {
  const legendSlot = h('div', { class: 'waste-legend' });
  const plotEl = h('div', { class: 'chart-plot', 'data-loading': t('load.loading') });
  const caption = h('p', { class: 'chart-caption' });
  const plastic = h('p', { class: 'chart-caption waste-plastic' });
  const el = h(
    'figure',
    { class: 'chart waste-chart' },
    legendSlot,
    plotEl,
    h('figcaption', {}, caption, plastic),
  );
  let last: WasteInput | null = null;
  const draw = ({ result, view, solidwaste, oceanplastic }: WasteInput) => {
    const bars = wasteBars(view, result.countries, solidwaste);
    const prefix = PART_TEXTS[view];
    legendSlot.replaceChildren(legendOf(t, prefix, bars));
    const margin = tightened(MARGIN, isTight(plotEl));
    const height = margin.top + margin.bottom + Math.max(1, bars.length) * ROW;
    const f = frame(plotEl, height, margin, t(`wasteChart.label.${view}`));
    const x = scaleLinear()
      .domain([0, Math.max(1, ...bars.map(barTotal))])
      .nice()
      .range([0, f.innerWidth]);
    drawAxis(f, x, locale);
    drawEmpty(f, bars.length === 0 ? t('wasteChart.empty') : '');
    bars.forEach((bar, i) =>
      drawBar(f, x, bar, i, {
        bar: t(`waste.bars.${bar.key}`),
        part: (key) => t(`${prefix}.${key}`),
        locale,
      }),
    );
    caption.textContent = t(`wasteChart.caption.${view}`, { year: solidwaste?.year ?? '' });
    plastic.textContent = plasticLine(t, locale, oceanplastic);
  };
  const render = () => {
    if (last) {
      draw(last);
    }
  };
  onResize(plotEl, render);
  return {
    el,
    update: (input) => {
      last = input;
      render();
    },
  };
};
