/** A heading's id from its text: lower case, accents dropped, words joined by hyphens. */
export const slug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The heading being read: the last whose top is at or above `line`, the first before any is,
 * and the last once the page is scrolled to its end, where the last ones may never reach the line.
 */
export const activeIndex = (tops: readonly number[], line: number, atEnd = false): number =>
  atEnd && tops.length > 0
    ? tops.length - 1
    : tops.reduce((found, top, i) => (top <= line ? i : found), 0);
