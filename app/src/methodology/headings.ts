import { slug } from './spy';

export interface Heading {
  id: string;
  title: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };

/** A heading's text: its tags dropped and the entities marked writes decoded. */
export const textOf = (html: string): string =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, e: string) => ENTITIES[e] ?? '');

const H2 = /<h2>([\s\S]*?)<\/h2>/g;

const headingOf = (inner: string, prefix: string): Heading => {
  const title = textOf(inner);
  return { id: `${prefix}-${slug(title)}`, title };
};

/** The section's HTML with an id on each of its h2 headings, made from `prefix` and its text. */
export const withHeadingIds = (
  html: string,
  prefix: string,
): { html: string; heads: Heading[] } => ({
  html: html.replace(
    H2,
    (_, inner: string) => `<h2 id="${headingOf(inner, prefix).id}">${inner}</h2>`,
  ),
  heads: [...html.matchAll(H2)].map((m) => headingOf(m[1] ?? '', prefix)),
});
