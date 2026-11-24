// Reads charts and the map off the page for `imageExport.ts`: their styles, in the light theme,
// written into a copy of each drawing, and their HTML legends read as legend items.

import {
  compose,
  type Block,
  type Composition,
  type KeyKind,
  type LegendItem,
} from './imageExport';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The computed styles a drawing needs once away from the page's stylesheet. */
const PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
  'visibility',
];

/** `f()` with the page in its light theme for the time of the call: nothing is painted between. */
const inLightTheme = <T>(f: () => T): T => {
  const root = document.documentElement;
  const before = root.getAttribute('data-theme');
  root.setAttribute('data-theme', 'light');
  try {
    return f();
  } finally {
    if (before === null) {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', before);
    }
  }
};

/** Writes each element's computed styles into its copy; an element not displayed is dropped. */
const inlineStyles = (source: Element, copy: Element): void => {
  const cs = getComputedStyle(source);
  if (cs.display === 'none') {
    copy.remove();
  } else {
    PROPS.forEach((p) => (copy as SVGElement).style.setProperty(p, cs.getPropertyValue(p)));
    const kids = [...copy.children];
    [...source.children].forEach((child, i) => {
      const twin = kids[i];
      if (twin) {
        inlineStyles(child, twin);
      }
    });
  }
};

/** A drawing's view box, or its size on the page when it has none. */
const boxOf = (svg: SVGSVGElement) => {
  const box = svg.viewBox.baseVal;
  return box && box.width > 0
    ? { x: box.x, y: box.y, width: box.width, height: box.height }
    : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
};

/** A drawing on the page as a standalone `<svg>`, sized by its view box. */
const standalone = (svg: SVGSVGElement): Pick<Block, 'svg' | 'width' | 'height'> => {
  const { x, y, width, height } = boxOf(svg);
  const copy = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, copy);
  ['class', 'style', 'width', 'height', 'role', 'aria-label'].forEach((a) =>
    copy.removeAttribute(a),
  );
  copy.setAttribute('xmlns', SVG_NS);
  copy.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  return { svg: new XMLSerializer().serializeToString(copy), width, height };
};

/** The colours a CSS gradient runs through, in order. */
const gradientColours = (image: string): string[] =>
  image.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi) ?? [];

/** How a key on the page is drawn, the first rule that matches its computed style. */
const KEY_RULES: { kind: KeyKind; test: (cs: CSSStyleDeclaration) => boolean }[] = [
  { kind: 'pair', test: (cs) => cs.backgroundImage.includes('gradient') },
  {
    kind: 'outline',
    test: (cs) => cs.borderTopStyle === 'dashed' && cs.borderBottomStyle === 'dashed',
  },
  { kind: 'dash', test: (cs) => cs.borderTopStyle === 'dashed' },
  { kind: 'dots', test: (cs) => cs.borderTopStyle === 'dotted' },
  { kind: 'line', test: (cs) => parseFloat(cs.height) <= 3 },
];

const kindOf = (cs: CSSStyleDeclaration): KeyKind =>
  KEY_RULES.find((r) => r.test(cs))?.kind ?? 'box';

const COLOUR: Record<KeyKind, (cs: CSSStyleDeclaration) => string> = {
  line: (cs) => cs.backgroundColor,
  box: (cs) => cs.backgroundColor,
  dash: (cs) => cs.borderTopColor,
  dots: (cs) => cs.borderTopColor,
  outline: (cs) => cs.borderTopColor,
  pair: (cs) => cs.backgroundColor,
};

/** How a key is drawn, from its computed style: its kind and its colours. */
const keyStyle = (cs: CSSStyleDeclaration): Pick<LegendItem, 'kind' | 'colour' | 'second'> => {
  const kind = kindOf(cs);
  const colours = gradientColours(cs.backgroundImage);
  return kind === 'pair'
    ? { kind, colour: colours[0] ?? cs.backgroundColor, second: colours.at(-1) }
    : { kind, colour: COLOUR[kind](cs) };
};

/** A legend on the page, its items shown, as legend items. */
const legendOf = (list: Element | null): LegendItem[] =>
  [...(list?.querySelectorAll('li') ?? [])]
    .filter((li) => getComputedStyle(li).display !== 'none')
    .map((li) => {
      const key = li.querySelector('.key, .swatch');
      return {
        label: (li.textContent ?? '').trim(),
        ...(key ? keyStyle(getComputedStyle(key)) : { kind: 'box' as const, colour: '#888' }),
      };
    });

const colours = (): Composition['colours'] => {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: v('--ink', '#17241e'),
    muted: v('--muted', '#55635c'),
    background: v('--surface', '#ffffff'),
  };
};

export interface Texts {
  title: string;
  credit: string;
}

/** The charts shown in a chart panel (the population chart under the temperature, when shown). */
const chartBlocks = (panel: Element): Block[] =>
  [...panel.querySelectorAll('figure.chart')]
    .filter((f) => !f.closest('[hidden]'))
    .flatMap((figure) => {
      const svg = figure.querySelector<SVGSVGElement>(':scope > .chart-plot > svg');
      return svg
        ? [
            {
              ...standalone(svg),
              subtitle: figure.querySelector(':scope > .chart-subtitle')?.textContent ?? undefined,
              legend: legendOf(
                figure.querySelector(
                  ':scope > .chart-legend, :scope > .legend-slot > .chart-legend',
                ),
              ),
            },
          ]
        : [];
    });

/** A chart panel as one export, or null while nothing is drawn in it. */
export const chartComposition = (panel: Element, texts: Texts): Composition | null =>
  inLightTheme(() => {
    const blocks = chartBlocks(panel);
    const first = panel.querySelector('figure.chart svg');
    return blocks.length
      ? {
          ...texts,
          description: first?.getAttribute('aria-label') ?? '',
          blocks,
          colours: colours(),
        }
      : null;
  });

/** The map card's map, with its legend, as one export. */
export const mapComposition = (card: Element, texts: Texts): Composition | null =>
  inLightTheme(() => {
    const svg = card.querySelector<SVGSVGElement>('svg.map-svg');
    return svg
      ? {
          ...texts,
          description: card.querySelector('.map-note')?.textContent ?? '',
          blocks: [{ ...standalone(svg), legend: legendOf(card.querySelector('.legend')) }],
          colours: colours(),
        }
      : null;
  });

/** The export drawn at twice its size on a canvas, as a PNG; null when the browser cannot. */
const png = (svg: string, width: number, height: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const canvas = Object.assign(document.createElement('canvas'), {
        width: width * 2,
        height: height * 2,
      });
      const ctx = canvas.getContext('2d');
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

/** The export as an SVG or PNG file's content, or null when there is nothing to save. */
export const imageBlob = async (
  c: Composition | null,
  format: 'svg' | 'png',
): Promise<Blob | null> => {
  const out = c && compose(c);
  return !out
    ? null
    : format === 'svg'
      ? new Blob([out.svg], { type: 'image/svg+xml' })
      : png(out.svg, out.width, out.height);
};
