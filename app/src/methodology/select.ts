import type { SectionId } from './sections';

export interface Section {
  id: SectionId;
  lang: string;
  title: string;
  markdown: string;
}

/** Maps a glob key such as '../../../docs/methodology/fr/data.md' to { lang, id }. */
export const parsePath = (path: string): { lang: string; id: string } | null => {
  const m = /\/([a-z]{2})\/([\w-]+)\.md$/.exec(path);
  return m ? { lang: m[1] ?? '', id: m[2] ?? '' } : null;
};

export const indexFiles = (files: Record<string, string>): Map<string, string> =>
  new Map(
    Object.entries(files).flatMap(([path, text]) => {
      const p = parsePath(path);
      return p ? [[`${p.lang}/${p.id}`, text] as [string, string]] : [];
    }),
  );

export const titleOf = (markdown: string): string | null =>
  /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? null;

/** The sections in order, in `lang` where written, in English otherwise; missing ones skipped. */
export const pickSections = (
  order: readonly SectionId[],
  files: Map<string, string>,
  lang: string,
  fallbackTitle: (id: SectionId) => string,
): Section[] =>
  order.flatMap((id) => {
    const found = [lang, 'en']
      .map((l) => ({ l, text: files.get(`${l}/${id}`) }))
      .find((f) => f.text !== undefined);
    return found?.text !== undefined
      ? [
          {
            id,
            lang: found.l,
            title: titleOf(found.text) ?? fallbackTitle(id),
            markdown: found.text,
          },
        ]
      : [];
  });
