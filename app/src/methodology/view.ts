import { marked } from 'marked';
import { h } from '../app/dom';
import type { Lang, T } from '../i18n/i18n';
import { SECTIONS, sectionTitleKey } from './sections';
import { indexFiles, pickSections } from './select';
import { activeIndex, slug } from './spy';

const FILES = indexFiles(
  import.meta.glob('../../../docs/methodology/*/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
);

const anchor = (id: string) => `method-${id}`;

/** Scrolls to the section a link names, again once the web font has reflowed the page. */
export const scrollToSection = (hash: string) => {
  const target = hash.startsWith('#method-') ? document.getElementById(hash.slice(1)) : null;
  if (target) {
    target.scrollIntoView();
    void document.fonts?.ready.then(() => target.isConnected && target.scrollIntoView());
  }
};

/** A rendered section, with an id on each of its own headings. */
const renderSection = (s: { id: string; lang: string; markdown: string }): HTMLElement => {
  const section = h('section', {
    id: anchor(s.id),
    class: 'method-section prose',
    lang: s.lang,
    'data-section': s.id,
  });
  section.innerHTML = marked.parse(s.markdown, { async: false });
  section
    .querySelectorAll('h2')
    .forEach((h2) => (h2.id = `${anchor(s.id)}-${slug(h2.textContent ?? '')}`));
  return section;
};

const link = (target: HTMLElement, text: string): HTMLAnchorElement =>
  h('a', { href: `#${target.id}`, class: 'toc-link' }, text);

/** A section's entry: its link, and its own headings' links under it. */
const entry = (section: HTMLElement, title: string) => {
  const heads = [...section.querySelectorAll<HTMLElement>('h2')];
  const subs = heads.map((head) => link(head, head.textContent ?? ''));
  const top = link(section, title);
  const el = h(
    'li',
    { class: 'toc-item' },
    top,
    subs.length ? h('ol', { class: 'toc-sub' }, ...subs.map((a) => h('li', {}, a))) : null,
  );
  return { section, heads, subs, top, el, title };
};
type Entry = ReturnType<typeof entry>;

/** Where a heading counts as reached: a little below the sticky header. */
const readingLine = (): number =>
  (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0) + 80;

const atPageEnd = (): boolean =>
  window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

const topsOf = (els: readonly HTMLElement[]): number[] =>
  els.map((el) => el.getBoundingClientRect().top);

/** The heading of `e` being read, or -1 while its first one is still below the line. */
const headingRead = (e: Entry, line: number, end: boolean): number => {
  const tops = topsOf(e.heads);
  const i = activeIndex(tops, line, end);
  return tops.length > 0 && ((tops[i] as number) <= line || end) ? i : -1;
};

/** Marks one entry: its own link while none of its headings is reached, else that heading's. */
const markEntry = (e: Entry, on: boolean, line: number, end: boolean) => {
  const sub = on ? headingRead(e, line, end) : -1;
  e.el.classList.toggle('active', on);
  e.top.toggleAttribute('aria-current', on && sub < 0);
  e.subs.forEach((a, j) => a.toggleAttribute('aria-current', j === sub));
};

/** Marks the section and heading being read, and keeps the marked link in the list's view. */
const markReading = (entries: readonly Entry[], list: HTMLElement, current: HTMLElement) => {
  const line = readingLine();
  const end = atPageEnd();
  const active = activeIndex(topsOf(entries.map((e) => e.section)), line, end);
  entries.forEach((e, i) => markEntry(e, i === active, line, end));
  current.textContent = entries[active]?.title ?? '';
  const marked = list.querySelector<HTMLElement>('[aria-current]');
  if (marked) keepInView(scrollerOf(list), marked);
};

/** What scrolls the links: the list itself when open on a phone, else the table of contents. */
const scrollerOf = (list: HTMLElement): HTMLElement =>
  list.scrollHeight > list.clientHeight ? list : (list.parentElement as HTMLElement);

/** Scrolls the table of contents, not the page, so `el` is inside it. */
const keepInView = (box: HTMLElement, el: HTMLElement) => {
  const b = box.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - b.height / 3;
};

/** Follows the page's scroll, once per frame, while the view is shown. */
const followScroll = (root: HTMLElement, update: () => void) => {
  let queued = false;
  const onScroll = () => {
    if (!queued && root.isConnected && root.offsetParent !== null) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  requestAnimationFrame(onScroll);
};

/** The Methodology page: the markdown sections in order, with a table of contents beside them. */
export const methodologyView = (t: T, lang: Lang): HTMLElement => {
  const sections = pickSections(SECTIONS, FILES, lang, (id) => t(sectionTitleKey(id)));
  const rendered = sections.map(renderSection);
  const entries = rendered.map((section, i) => entry(section, sections[i]?.title ?? ''));
  const list = h('ol', { id: 'toc-list', class: 'toc-list' }, ...entries.map((e) => e.el));
  const current = h('span', { class: 'toc-current' });
  const toggle = h(
    'button',
    { type: 'button', class: 'toc-toggle', 'aria-expanded': 'false', 'aria-controls': 'toc-list' },
    h('span', { class: 'toc-label' }, t('methodology.toc')),
    current,
  );
  const toc = h(
    'nav',
    { class: 'toc', 'aria-label': t('methodology.toc') },
    h('h2', {}, t('methodology.toc')),
    toggle,
    list,
  );
  const setOpen = (open: boolean) => {
    toc.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!toc.classList.contains('open')));
  list.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  });
  toc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toc.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  const body = rendered.length ? rendered : [h('p', {}, t('methodology.empty'))];
  const root = h(
    'div',
    { class: 'methodology' },
    toc,
    h('article', { class: 'method-body' }, h('h1', {}, t('methodology.title')), ...body),
  );
  followScroll(root, () => markReading(entries, list, current));
  return root;
};
