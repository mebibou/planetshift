import { marked } from 'marked';
import { h } from '../app/dom';
import type { Lang, T } from '../i18n/i18n';
import { SECTIONS, sectionTitleKey } from './sections';
import { indexFiles, pickSections } from './select';

const FILES = indexFiles(
  import.meta.glob('../../../docs/methodology/*/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
);

const anchor = (id: string) => `method-${id}`;

/** The Methodology page: the markdown sections in order, with a table of contents beside them. */
export const methodologyView = (t: T, lang: Lang): HTMLElement => {
  const sections = pickSections(SECTIONS, FILES, lang, (id) => t(sectionTitleKey(id)));
  const toc = h(
    'nav',
    { class: 'toc', 'aria-label': t('methodology.toc') },
    h('h2', {}, t('methodology.toc')),
    h('ol', {}, ...sections.map((s) => h('li', {}, h('a', { href: `#${anchor(s.id)}` }, s.title)))),
  );
  const body = sections.length
    ? sections.map((s) => {
        const section = h('section', {
          id: anchor(s.id),
          class: 'method-section prose',
          lang: s.lang,
          'data-section': s.id,
        });
        section.innerHTML = marked.parse(s.markdown, { async: false });
        return section;
      })
    : [h('p', {}, t('methodology.empty'))];
  return h(
    'div',
    { class: 'methodology' },
    toc,
    h('article', { class: 'method-body' }, h('h1', {}, t('methodology.title')), ...body),
  );
};
