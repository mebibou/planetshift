import { axisBottom, axisLeft, pointer, select, type ScaleLinear, type Selection } from 'd3';
import { h } from '../app/dom';
import { placeTooltip } from '../app/place';

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

/** Charts on the same years that follow one another's hover year. */
export interface HoverLink {
  /** What chart `id` does when another one shows a year, or hides (null); replaces its last. */
  listen: (id: string, show: (year: number | null) => void) => void;
  share: (from: string, year: number | null) => void;
}

export const hoverLink = (): HoverLink => {
  const shows = new Map<string, (year: number | null) => void>();
  return {
    listen: (id, show) => {
      shows.set(id, show);
    },
    share: (from, year) => shows.forEach((show, id) => id !== from && show(year)),
  };
};

/** Years the keys move the crosshair by. */
const KEY_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
};

/**
 * Crosshair and tooltip following the nearest year, shown too when a `linked` chart shows a year. A touch keeps the tooltip once the finger
 * lifts, until a tap elsewhere; the tooltip is placed in screen pixels, as the svg scales down
 * on narrow screens. The container takes the keyboard focus, and the arrow keys, Page Up and
 * Down, Home and End move the crosshair; `keys` says so to screen readers.
 */
/** The year a key moves the keyboard's reading to, or null for a key that does not move it. */
const yearForKey = (
  key: string,
  lo: number,
  hi: number,
  at: number,
  clamp: (year: number) => number,
): number | null => {
  const step = KEY_STEPS[key];
  return key === 'Home' ? lo : key === 'End' ? hi : step ? clamp(at + step) : null;
};

export const addHover = (
  container: HTMLElement,
  f: Frame,
  x: ScaleLinear<number, number>,
  margin: Margin,
  rowsAt: (year: number) => HoverRow[],
  keys: string,
  linked?: { link: HoverLink; id: string },
): void => {
  container.querySelector('.chart-tooltip')?.remove();
  const tip = h('div', { class: 'tooltip chart-tooltip', 'aria-live': 'polite', hidden: true });
  container.append(tip);
  const line = f.plot
    .append('line')
    .attr('class', 'crosshair')
    .attr('y1', 0)
    .attr('y2', f.innerHeight)
    .style('display', 'none');
  const [lo, hi] = x.domain() as [number, number];
  const outside = (e: Event) => {
    if (!container.contains(e.target as Node)) clear();
  };
  const hide = () => {
    line.style('display', 'none');
    tip.hidden = true;
    document.removeEventListener('pointerdown', outside);
  };
  const showYear = (year: number) => {
    container.dataset.year = String(year);
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
    const box = container.getBoundingClientRect();
    const svgBox = f.svg.node()?.getBoundingClientRect();
    const scale = svgBox && svgBox.width > 0 ? svgBox.width / f.width : 1;
    const offset = svgBox ? svgBox.left - box.left : 0;
    const { left } = placeTooltip(
      offset + (cx + margin.left) * scale,
      0,
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { width: box.width, height: box.height },
    );
    tip.style.left = `${left}px`;
    tip.style.top = `${margin.top * scale}px`;
  };
  const point = (year: number) => {
    showYear(year);
    linked?.link.share(linked.id, year);
  };
  const clear = () => {
    hide();
    linked?.link.share(linked.id, null);
  };
  const clamp = (year: number) => Math.max(lo, Math.min(hi, year));
  linked?.link.listen(linked.id, (year) => (year === null ? hide() : showYear(clamp(year))));
  f.plot
    .append('rect')
    .attr('class', 'hover-target')
    .attr('width', f.innerWidth)
    .attr('height', f.innerHeight)
    .on('pointermove pointerdown', (event: PointerEvent) => {
      const [px] = pointer(event);
      point(clamp(Math.round(x.invert(px))));
    })
    .on('pointerleave', (event: PointerEvent) => {
      if (event.pointerType === 'touch') document.addEventListener('pointerdown', outside);
      else if (document.activeElement !== container) clear();
    });
  const focused = () => Number(container.dataset.year ?? hi);
  container.tabIndex = 0;
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', `${f.svg.attr('aria-label')}. ${keys}`);
  container.onfocus = () => {
    delete container.dataset.dismissed;
    if (container.matches(':focus-visible')) point(clamp(focused()));
  };
  container.onblur = clear;
  container.onkeydown = (e) => {
    const year = yearForKey(e.key, lo, hi, focused(), clamp);
    if (e.key === 'Escape') dismiss();
    if (year !== null) {
      e.preventDefault();
      delete container.dataset.dismissed;
      point(year);
    }
  };
  // Escape hides the tooltip until the reader moves again, even through a redraw.
  const dismiss = () => {
    container.dataset.dismissed = '';
    clear();
  };
  if (document.activeElement === container && !('dismissed' in container.dataset))
    showYear(clamp(focused()));
};

/** Re-renders when the container's width changes. */
export const onResize = (el: HTMLElement, render: () => void): void => {
  let width = el.clientWidth;
  if (typeof ResizeObserver !== 'undefined')
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
