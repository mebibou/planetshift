import { geoEqualEarth, geoGraticule10, geoPath } from 'd3';
import type { Topology } from 'topojson-specification';
import { h, svg } from '../app/dom';
import { placeTooltip } from '../app/place';
import { countryFeatures, iso3Of } from './geo';
import type { TooltipModel } from './tooltip';

const WIDTH = 960;

export interface MapPaint {
  fillOf: (iso3: string) => string | null;
  tooltipOf: (iso3: string) => TooltipModel;
}

export interface Choropleth {
  el: HTMLElement;
  paint: (p: MapPaint) => void;
}

const tooltipContent = (m: TooltipModel): Node[] =>
  [
    h('strong', {}, m.title),
    h(
      'dl',
      {},
      ...m.rows.flatMap(([k, v]) =>
        v ? [h('dt', {}, k), h('dd', {}, v)] : [h('dt', { class: 'wide' }, k)],
      ),
    ),
    m.source
      ? h(
          'p',
          { class: 'tooltip-source' },
          m.source.url
            ? h('a', { href: m.source.url, target: '_blank', rel: 'noopener' }, m.source.label)
            : m.source.label,
        )
      : null,
  ].filter((n): n is HTMLElement => n !== null);

/** An Equal Earth choropleth; one path per country, keyed by data-iso3. */
export const choropleth = (world: Topology, label: string): Choropleth => {
  const features = countryFeatures(world);
  const projection = geoEqualEarth().fitWidth(WIDTH - 16, { type: 'Sphere' });
  const path = geoPath(projection);
  const [[, y0], [, y1]] = path.bounds({ type: 'Sphere' });
  const height = Math.ceil(y1 - y0) + 16;
  projection.translate([WIDTH / 2, height / 2]);
  const tooltip = h('div', { class: 'tooltip', role: 'status', hidden: true });
  const paths = features.map((f) => {
    const iso3 = iso3Of(f);
    return svg('path', {
      d: path(f) ?? '',
      class: iso3 ? 'country' : 'country no-id',
      'data-iso3': iso3 ?? undefined,
    });
  });
  const map = svg(
    'svg',
    { viewBox: `0 0 ${WIDTH} ${height}`, role: 'img', 'aria-label': label, class: 'map-svg' },
    svg('path', { d: path({ type: 'Sphere' }) ?? '', class: 'sphere' }),
    svg('path', { d: path(geoGraticule10()) ?? '', class: 'graticule' }),
    svg('g', {}, ...paths),
  );
  const el = h('div', { class: 'map-frame' }, map, tooltip);
  let current: MapPaint | null = null;
  let pinned = false;
  let press: { id: number; x: number; y: number } | null = null;
  const outside = (e: Event) => {
    if (!el.contains(e.target as Node)) hide();
  };
  const hide = () => {
    pinned = false;
    tooltip.hidden = true;
    tooltip.classList.remove('pinned');
    document.removeEventListener('pointerdown', outside);
  };
  const show = (e: PointerEvent, pin: boolean) => {
    const iso3 = (e.target as Element).getAttribute?.('data-iso3');
    if (iso3 && current) showAt(e, pin, current.tooltipOf(iso3));
    else hide();
  };
  const showAt = (e: PointerEvent, pin: boolean, model: TooltipModel) => {
    pinned = pin;
    tooltip.classList.toggle('pinned', pin);
    if (pin) document.addEventListener('pointerdown', outside);
    tooltip.replaceChildren(...tooltipContent(model));
    tooltip.hidden = false;
    const box = el.getBoundingClientRect();
    const { left, top } = placeTooltip(
      e.clientX - box.left,
      e.clientY - box.top,
      { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
      { width: box.width, height: box.height },
      14,
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  map.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' && !pinned) show(e, false);
  });
  map.addEventListener('pointerdown', (e) => {
    press = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  map.addEventListener('pointerup', (e) => {
    const still =
      press?.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 10;
    press = null;
    if (still) show(e, true);
  });
  map.addEventListener('pointercancel', () => {
    press = null;
  });
  map.addEventListener('pointerleave', () => {
    if (!pinned) hide();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
  return {
    el,
    paint: (p) => {
      current = p;
      paths.forEach((node) => {
        const iso3 = node.getAttribute('data-iso3');
        const fill = iso3 ? p.fillOf(iso3) : null;
        node.style.fill = fill ?? 'var(--map-nodata)';
        node.classList.toggle('has-data', fill !== null);
      });
    },
  };
};
