import { axisBottom, axisLeft, pointer, select, type ScaleLinear, type Selection } from 'd3';
import { h } from '../app/dom';

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Frame {
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  plot: Selection<SVGGElement, unknown, null, undefined>;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
}

/** Replaces the container's svg with a fresh one sized to the container. */
export const frame = (
  container: HTMLElement,
  height: number,
  margin: Margin,
  label: string,
): Frame => {
  container.querySelector('svg')?.remove();
  const width = Math.max(280, container.clientWidth || 640);
  const svg = select(container)
    .insert('svg', ':first-child')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', label)
    .attr('class', 'chart-svg');
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  return {
    svg,
    plot,
    width,
    height,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
  };
};

export const drawAxes = (
  f: Frame,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  formatY: (v: number) => string,
  yTicks = 5,
): void => {
  const xTicks = Math.max(2, Math.min(8, Math.floor(f.innerWidth / 80)));
  f.plot
    .append('g')
    .attr('class', 'grid')
    .call(
      axisLeft(y)
        .ticks(yTicks)
        .tickSize(-f.innerWidth)
        .tickFormat(() => ''),
    )
    .call((g) => g.select('.domain').remove());
  f.plot
    .append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${f.innerHeight})`)
    .call(
      axisBottom(x)
        .ticks(xTicks)
        .tickFormat((d) => String(d))
        .tickSizeOuter(0),
    );
  f.plot
    .append('g')
    .attr('class', 'axis axis-y')
    .call(
      axisLeft(y)
        .ticks(yTicks)
        .tickFormat((d) => formatY(Number(d)))
        .tickSize(0)
        .tickPadding(6),
    )
    .call((g) => g.select('.domain').remove());
};

export const verticalRule = (f: Frame, x: number, label: string, className = 'rule'): void => {
  const g = f.plot.append('g').attr('class', className);
  g.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', f.innerHeight);
  g.append('text')
    .attr('x', x)
    .attr('y', -6)
    .attr('text-anchor', x > f.innerWidth - 40 ? 'end' : 'middle')
    .text(label);
};

export interface HoverRow {
  label: string;
  value: string;
  swatch?: string; // CSS colour of the series
}

/** Crosshair and tooltip following the nearest year. */
export const addHover = (
  container: HTMLElement,
  f: Frame,
  x: ScaleLinear<number, number>,
  margin: Margin,
  rowsAt: (year: number) => HoverRow[],
): void => {
  container.querySelector('.chart-tooltip')?.remove();
  const tip = h('div', { class: 'tooltip chart-tooltip', hidden: true });
  container.append(tip);
  const line = f.plot
    .append('line')
    .attr('class', 'crosshair')
    .attr('y1', 0)
    .attr('y2', f.innerHeight)
    .style('display', 'none');
  const [lo, hi] = x.domain() as [number, number];
  f.plot
    .append('rect')
    .attr('class', 'hover-target')
    .attr('width', f.innerWidth)
    .attr('height', f.innerHeight)
    .on('pointermove pointerdown', (event: PointerEvent) => {
      const [px] = pointer(event);
      const year = Math.max(lo, Math.min(hi, Math.round(x.invert(px))));
      const cx = x(year);
      line.attr('x1', cx).attr('x2', cx).style('display', null);
      tip.replaceChildren(
        h('strong', {}, String(year)),
        h(
          'dl',
          {},
          ...rowsAt(year).flatMap((r) => [
            h(
              'dt',
              {},
              r.swatch ? h('span', { class: 'swatch', style: `background: ${r.swatch}` }) : null,
              r.label,
            ),
            h('dd', {}, r.value),
          ]),
        ),
      );
      tip.hidden = false;
      const flip = cx > f.innerWidth / 2;
      tip.style.left = flip ? 'auto' : `${cx + margin.left + 12}px`;
      tip.style.right = flip ? `${f.width - cx - margin.left + 12}px` : 'auto';
      tip.style.top = `${margin.top}px`;
    })
    .on('pointerleave', () => {
      line.style('display', 'none');
      tip.hidden = true;
    });
};

/** Re-renders when the container's width changes. */
export const onResize = (el: HTMLElement, render: () => void): void => {
  if (typeof ResizeObserver === 'undefined') return;
  let width = el.clientWidth;
  new ResizeObserver(() => {
    if (el.clientWidth !== width) {
      width = el.clientWidth;
      render();
    }
  }).observe(el);
};

export const legendList = (items: { label: string; className: string }[]): HTMLElement =>
  h(
    'ul',
    { class: 'chart-legend' },
    ...items.map((i) => h('li', {}, h('span', { class: `key ${i.className}` }), i.label)),
  );
