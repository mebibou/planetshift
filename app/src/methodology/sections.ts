import { MODULE_PAGES } from '../levers/registry';

/** The core's pages before the lever modules' pages, and after them. */
const HEAD = ['overview', 'data', 'shift', 'feed', 'emissions', 'seafood', 'land', 'levers'];
const TAIL = ['hestia', 'literature', 'climate', 'link', 'options', 'assumptions', 'limitations'];

/**
 * The order of the Methodology page: one markdown file per section in docs/methodology/<lang>/,
 * the modules' pages (in the order of the panel) after the core's Levers page.
 */
export const SECTIONS: readonly string[] = [...HEAD, ...MODULE_PAGES.map((p) => p.page), ...TAIL];
export type SectionId = string;

/** The core's pages, which a module may name as the page that covers it. */
export const CORE_SECTIONS: readonly string[] = [...HEAD, ...TAIL];

/** The i18n key of a section's title, used when its file has no heading. */
export const sectionTitleKey = (id: SectionId): string => {
  const own = MODULE_PAGES.find((p) => p.page === id);
  return own ? `levers.${own.module}.page` : `methodology.sections.${id}`;
};
