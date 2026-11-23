// A chart or the map as a standalone SVG or PNG: the drawing with its styles written into it,
// its legend redrawn in SVG, a title, its description and a credit line. Exports are always
// in the light theme, which reads best in documents and slides.

/** The page's fonts, named: an SVG opened elsewhere uses the first one installed. */
const FONT = 'Lato, Helvetica, Arial, sans-serif';
const PAD = 24;
const GAP = 14;
const TITLE = { size: 20, line: 26 };
const TEXT = { size: 13, line: 18 };
const KEY = { width: 22, gap: 8, after: 18, row: 22 };
/** About the width of one character of 13 px Lato, to wrap text and lay out the legend. */
const CHAR = 6.6;

/** Words joined into lines of at most `max` characters; a longer word keeps a line of its own. */
export const wrapText = (text: string, max: number): string[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .reduce<string[]>((lines, word) => {
      const last = lines.at(-1);
      return last !== undefined && last.length + 1 + word.length <= max
        ? [...lines.slice(0, -1), `${last} ${word}`]
        : [...lines, word];
    }, []);

/** Where each of a column of blocks starts, `gap` apart, and the column's height. */
export const stack = (
  heights: readonly number[],
  gap: number,
): { tops: number[]; height: number } =>
  heights.reduce<{ tops: number[]; height: number }>(
    (acc, h, i) => ({
      tops: [...acc.tops, acc.height + (i ? gap : 0)],
      height: acc.height + (i ? gap : 0) + h,
    }),
    { tops: [], height: 0 },
  );

/** How a legend key is drawn: a line, dashed or dotted, a box, a dashed outline, or a dot of two colours. */
export type KeyKind = 'line' | 'dash' | 'dots' | 'box' | 'outline' | 'pair';

export interface LegendItem {
  label: string;
  colour: string;
  /** The second colour of a two-coloured dot. */
  second?: string;
  kind: KeyKind;
}

/** Each legend item's place, wrapping onto a new row past `width`. */
export const legendPlaces = (
  items: readonly LegendItem[],
  width: number,
): { x: number; row: number }[] =>
  items.reduce<{ places: { x: number; row: number }[]; x: number; row: number }>(
    (acc, item) => {
      const w = KEY.width + KEY.gap + item.label.length * CHAR;
      const wrap = acc.x > 0 && acc.x + w > width;
      const x = wrap ? 0 : acc.x;
      const row = wrap ? acc.row + 1 : acc.row;
      return { places: [...acc.places, { x, row }], x: x + w + KEY.after, row };
    },
    { places: [], x: 0, row: 0 },
  ).places;

export const legendHeight = (items: readonly LegendItem[], width: number): number =>
  items.length ? (Math.max(...legendPlaces(items, width).map((p) => p.row)) + 1) * KEY.row : 0;

export const escapeXml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const KEYS: Record<KeyKind, (c: string, second: string) => string> = {
  line: (c) => `<line x1="0" y1="0" x2="${KEY.width}" y2="0" stroke="${c}" stroke-width="2"/>`,
  dash: (c) =>
    `<line x1="0" y1="0" x2="${KEY.width}" y2="0" stroke="${c}" stroke-width="2" stroke-dasharray="4 3"/>`,
  dots: (c) =>
    `<line x1="0" y1="0" x2="${KEY.width}" y2="0" stroke="${c}" stroke-width="1.5" stroke-dasharray="1.5 2.5"/>`,
  box: (c) => `<rect x="0" y="-5" width="${KEY.width}" height="10" rx="2" fill="${c}"/>`,
  outline: (c) =>
    `<rect x="0.75" y="-4.25" width="${KEY.width - 1.5}" height="8.5" rx="2" fill="none" stroke="${c}" stroke-dasharray="3 2"/>`,
  pair: (c, second) =>
    `<path d="M11 -4 a4 4 0 0 0 0 8 z" fill="${c}"/><path d="M11 -4 a4 4 0 0 1 0 8 z" fill="${second}"/>`,
};

/** A legend in SVG, its rows `KEY.row` apart, from (0, 0). */
export const legendSvg = (items: readonly LegendItem[], width: number, muted: string): string =>
  legendPlaces(items, width)
    .map(({ x, row }, i) => {
      const item = items[i] as LegendItem;
      const y = row * KEY.row + KEY.row / 2;
      return (
        `<g transform="translate(${x} ${y})">${KEYS[item.kind](item.colour, item.second ?? item.colour)}` +
        `<text x="${KEY.width + KEY.gap}" y="4" font-size="${TEXT.size}" fill="${muted}">${escapeXml(item.label)}</text></g>`
      );
    })
    .join('');

/** One drawing of the export, with what is drawn above it. */
export interface Block {
  /** The drawing, an `<svg>` already standalone, and its size. */
  svg: string;
  width: number;
  height: number;
  subtitle?: string;
  legend: LegendItem[];
}

export interface Composition {
  title: string;
  description: string;
  credit: string;
  blocks: Block[];
  colours: { ink: string; muted: string; background: string };
}

const textLines = (
  lines: readonly string[],
  x: number,
  y: number,
  size: number,
  line: number,
  fill: string,
  bold = false,
) =>
  lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * line + size}" font-size="${size}" ${bold ? 'font-weight="700" ' : ''}fill="${fill}">${escapeXml(l)}</text>`,
    )
    .join('');

/** A block's parts from its top: its subtitle, its legend, its drawing. */
const blockSvg = (b: Block, width: number, top: number, c: Composition['colours']) => {
  const sub = b.subtitle ? TEXT.line + 6 : 0;
  const legend = legendHeight(b.legend, width);
  const scale = Math.min(1, width / b.width);
  const svg = b.svg.replace(
    /^<svg/,
    `<svg x="0" y="${sub + legend + (legend ? 6 : 0)}" width="${b.width * scale}" height="${b.height * scale}"`,
  );
  return {
    height: sub + legend + (legend ? 6 : 0) + b.height * scale,
    svg:
      `<g transform="translate(${PAD} ${top})">` +
      (b.subtitle ? textLines([b.subtitle], 0, 0, 15, TEXT.line, c.ink, true) : '') +
      `<g transform="translate(0 ${sub})">${legendSvg(b.legend, width, c.muted)}</g>${svg}</g>`,
  };
};

const blockHeight = (b: Block, width: number) =>
  (b.subtitle ? TEXT.line + 6 : 0) +
  (b.legend.length ? legendHeight(b.legend, width) + 6 : 0) +
  b.height * Math.min(1, width / b.width);

/** The whole export as one SVG document, and its size. */
export const compose = (c: Composition): { svg: string; width: number; height: number } => {
  const inner = Math.max(...c.blocks.map((b) => b.width), 480);
  const width = inner + 2 * PAD;
  const chars = Math.floor(inner / CHAR);
  const title = wrapText(c.title, Math.floor(inner / (TITLE.size * 0.55)));
  const description = wrapText(c.description, chars);
  const head = title.length * TITLE.line + 6 + description.length * TEXT.line;
  const { tops, height: body } = stack(
    c.blocks.map((b) => blockHeight(b, inner)),
    GAP + 4,
  );
  const top = PAD + head + GAP;
  const creditTop = top + body + GAP;
  const height = creditTop + TEXT.line + PAD;
  const k = c.colours;
  return {
    width,
    height,
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">` +
      `<rect width="100%" height="100%" fill="${k.background}"/>` +
      textLines(title, PAD, PAD, TITLE.size, TITLE.line, k.ink, true) +
      textLines(
        description,
        PAD,
        PAD + title.length * TITLE.line + 6,
        TEXT.size,
        TEXT.line,
        k.muted,
      ) +
      c.blocks.map((b, i) => blockSvg(b, inner, top + (tops[i] ?? 0), k).svg).join('') +
      textLines([c.credit], PAD, creditTop, 12, TEXT.line, k.muted) +
      '</svg>',
  };
};

/** A file name with another extension: `planetshift-temperature-x.csv` → `….svg`. */
export const withExtension = (name: string, ext: 'svg' | 'png'): string =>
  name.replace(/\.[a-z]+$/, '') + `.${ext}`;
