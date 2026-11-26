/** Where a row that scrolls sideways is: how far it has scrolled, how wide it shows, how wide it is. */
export interface ScrollBox {
  left: number;
  width: number;
  scrollWidth: number;
}

/** Whether there is more to show past each edge of the row. */
export interface Edges {
  start: boolean;
  end: boolean;
}

/** Past a pixel or less of rounding, an edge has nothing more to show. */
const SLACK = 1;

/** A page: most of the row, so the option cut at its edge is still in sight after the scroll. */
const PAGE = 0.8;

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);

const maxLeft = ({ width, scrollWidth }: ScrollBox): number => Math.max(0, scrollWidth - width);

export const edgesOf = (box: ScrollBox): Edges => ({
  start: box.left > SLACK,
  end: box.left < maxLeft(box) - SLACK,
});

/** The edges kept as they were when nothing changed, so that a scroll does not draw again. */
export const keepEdges = (before: Edges, now: Edges): Edges =>
  before.start === now.start && before.end === now.end ? before : now;

/** The mask that fades the edges with more past them, `fade` wide; none when both are clear. */
export const fadeMask = ({ start, end }: Edges, fade: string): string | undefined =>
  start || end
    ? `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 ${fade}, #000 calc(100% - ${fade}), ${end ? 'transparent' : '#000'})`
    : undefined;

/** Where a page's scroll towards the end (1) or the start (-1) lands. */
export const pageLeft = (box: ScrollBox, direction: 1 | -1): number =>
  clamp(box.left + direction * Math.round(box.width * PAGE), 0, maxLeft(box));

/** Where the row scrolls to show an option with `margin` to spare; where it is if it shows. */
export const revealLeft = (
  box: ScrollBox,
  item: { left: number; width: number },
  margin: number,
): number =>
  clamp(
    Math.min(Math.max(box.left, item.left + item.width + margin - box.width), item.left - margin),
    0,
    maxLeft(box),
  );
