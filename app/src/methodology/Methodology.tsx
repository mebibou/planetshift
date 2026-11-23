import 'katex/dist/katex.min.css';
import { use, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Lang, T } from '../i18n/i18n';
import { withHeadingIds, type Heading } from './headings';
import { renderMarkdown } from './markdown';
import { SECTIONS, sectionTitleKey } from './sections';
import { indexFiles, pickSections } from './select';
import { activeIndex } from './spy';

const LOADERS: Record<Lang, () => Promise<{ default: Record<string, string> }>> = {
  en: () => import('./docs-en'),
  fr: () => import('./docs-fr'),
};

const loading = new Map<Lang, Promise<Map<string, string>>>();

/** The pages in `lang` and in English, where an untranslated page is read; loaded once. */
const filesFor = (lang: Lang): Promise<Map<string, string>> => {
  const files =
    loading.get(lang) ??
    Promise.all([...new Set<Lang>([lang, 'en'])].map((l) => LOADERS[l]())).then((mods) =>
      indexFiles(Object.assign({}, ...mods.map((m) => m.default))),
    );
  loading.set(lang, files);
  return files;
};

const anchor = (id: string) => `method-${id}`;

interface Section {
  id: string;
  title: string;
  lang: string;
  html: string;
  heads: Heading[];
}

const sectionsFor = (t: T, lang: Lang, files: Map<string, string>): Section[] =>
  pickSections(SECTIONS, files, lang, (id) => t(sectionTitleKey(id))).map((s) => ({
    id: s.id,
    title: s.title,
    lang: s.lang,
    ...withHeadingIds(renderMarkdown(s.markdown), anchor(s.id)),
  }));

/** Scrolls to the section a link names, again once the web font has reflowed the page. */
export const scrollToSection = (hash: string) => {
  const target = hash.startsWith('#method-') ? document.getElementById(hash.slice(1)) : null;
  if (target) {
    target.scrollIntoView();
    void document.fonts?.ready.then(() => target.isConnected && target.scrollIntoView());
  }
};

interface Reading {
  /** The section being read. */
  active: number;
  /** Its heading being read, or -1 while its first one is still below the line. */
  sub: number;
}

/** Where a heading counts as reached: a little below the sticky header. */
const readingLine = (): number =>
  (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0) + 80;

const atPageEnd = (): boolean =>
  window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

const topOf = (id: string): number =>
  document.getElementById(id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;

const subRead = (heads: readonly Heading[], line: number, end: boolean): number => {
  const tops = heads.map((h) => topOf(h.id));
  const i = activeIndex(tops, line, end);
  return tops.length > 0 && ((tops[i] as number) <= line || end) ? i : -1;
};

const readingOf = (sections: readonly Section[]): Reading => {
  const line = readingLine();
  const end = atPageEnd();
  const active = activeIndex(
    sections.map((s) => topOf(anchor(s.id))),
    line,
    end,
  );
  return { active, sub: subRead(sections[active]?.heads ?? [], line, end) };
};

/** The section and heading being read, following the page's scroll once per frame. */
const useReading = (sections: readonly Section[]): Reading => {
  const [reading, setReading] = useState<Reading>({ active: 0, sub: -1 });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readingOf(sections);
        setReading((r) => (r.active === next.active && r.sub === next.sub ? r : next));
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sections]);
  return reading;
};

/** Scrolls the table of contents, not the page, so its marked link is inside it. */
const keepMarkedInView = (nav: HTMLElement, list: HTMLElement) => {
  const marked = list.querySelector<HTMLElement>('[aria-current]');
  const b = nav.getBoundingClientRect();
  const r = marked?.getBoundingClientRect();
  if (r && (r.top < b.top || r.bottom > b.bottom)) nav.scrollTop += r.top - b.top - b.height / 3;
};

const TocEntry = ({ section, on, sub }: { section: Section; on: boolean; sub: number }) => (
  <li className={on ? 'toc-item active' : 'toc-item'}>
    <a
      href={`#${anchor(section.id)}`}
      className="toc-link"
      aria-current={on && sub < 0 ? 'location' : undefined}
    >
      {section.title}
    </a>
    {section.heads.length > 0 && (
      <ol className="toc-sub">
        {section.heads.map((h, j) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="toc-link"
              aria-current={on && j === sub ? 'location' : undefined}
            >
              {h.title}
            </a>
          </li>
        ))}
      </ol>
    )}
  </li>
);

const Toc = ({ t, sections }: { t: T; sections: readonly Section[] }) => {
  const [open, setOpen] = useState(false);
  const { active, sub } = useReading(sections);
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const l = list.current;
    // The list scrolls on its own only when open on a phone, where the reader is browsing it.
    if (nav.current && l && l.scrollHeight <= l.clientHeight) keepMarkedInView(nav.current, l);
  }, [active, sub]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      toggle.current?.focus();
    }
  };
  return (
    <nav
      ref={nav}
      className={open ? 'toc open' : 'toc'}
      aria-label={t('methodology.toc')}
      onKeyDown={onKeyDown}
    >
      <h2>{t('methodology.toc')}</h2>
      <button
        ref={toggle}
        type="button"
        className="toc-toggle"
        aria-expanded={open}
        aria-controls="toc-list"
        onClick={() => setOpen(!open)}
      >
        <span className="toc-label">{t('methodology.toc')}</span>
        <span className="toc-current">{sections[active]?.title ?? ''}</span>
      </button>
      <ol
        ref={list}
        id="toc-list"
        className="toc-list"
        onClick={(e) => (e.target as Element).closest('a') && setOpen(false)}
      >
        {sections.map((s, i) => (
          <TocEntry key={s.id} section={s} on={i === active} sub={sub} />
        ))}
      </ol>
    </nav>
  );
};

/** The Methodology page: the markdown sections in order, with a table of contents beside them. */
const Methodology = ({ t, lang }: { t: T; lang: Lang }) => {
  const files = use(filesFor(lang));
  const sections = useMemo(() => sectionsFor(t, lang, files), [t, lang, files]);
  useEffect(() => scrollToSection(location.hash), []);
  return (
    <div className="methodology">
      <Toc t={t} sections={sections} />
      <article className="method-body">
        <h1>{t('methodology.title')}</h1>
        {sections.length ? (
          sections.map((s) => (
            <section
              key={s.id}
              id={anchor(s.id)}
              className="method-section prose"
              lang={s.lang}
              data-section={s.id}
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          ))
        ) : (
          <p>{t('methodology.empty')}</p>
        )}
      </article>
    </div>
  );
};

export default Methodology;
