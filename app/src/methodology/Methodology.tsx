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

/** Starts loading the pages in `lang` early, so the page shows as soon as it can. */
export const preloadMethodology = (lang: Lang): Promise<unknown> => filesFor(lang);

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
  if (r && (r.top < b.top || r.bottom > b.bottom)) {
    nav.scrollTop += r.top - b.top - b.height / 3;
  }
};

const LINK =
  'toc-link -ml-0.5 flex items-baseline gap-1.5 rounded-r-md border-l-2 border-transparent leading-[1.35] no-underline transition-[background-color,border-color,color] duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2 [&[aria-current]]:border-l-accent [&[aria-current]]:bg-accent-soft [&[aria-current]]:text-accent';
const NUMBERED =
  'before:w-[1.7em] before:flex-none before:text-[0.78em] before:text-muted before:tabular-nums before:content-[counter(toc,decimal-leading-zero)]';
const TOP_LINK = `${LINK} ${NUMBERED} px-2.5 py-[5px] max-md:py-2 [&[aria-current]]:font-bold`;
const SUB_LINK = `${LINK} py-[3px] pr-2.5 pl-[calc(1.7em+16px)] text-[0.82rem] text-muted [&[aria-current]]:font-semibold`;

/** The section being read: its number and title marked, its subsections listed. */
const ENTRY = {
  on: { item: 'active', link: 'border-l-accent font-bold text-accent', subs: 'block' },
  off: { item: '', link: 'text-ink', subs: 'hidden' },
};

const TocEntry = ({ section, on, sub }: { section: Section; on: boolean; sub: number }) => {
  const look = ENTRY[on ? 'on' : 'off'];
  return (
    <li className={`toc-item [counter-increment:toc] ${look.item}`}>
      <a
        href={`#${anchor(section.id)}`}
        className={`${TOP_LINK} ${look.link}`}
        aria-current={on && sub < 0 ? 'location' : undefined}
      >
        {section.title}
      </a>
      {section.heads.length > 0 && (
        <ol className={`toc-sub m-0 mt-0.5 mb-1.5 list-none p-0 ${look.subs}`}>
          {section.heads.map((h, j) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={SUB_LINK}
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
};

const Toc = ({ t, sections }: { t: T; sections: readonly Section[] }) => {
  const [open, setOpen] = useState(false);
  const { active, sub } = useReading(sections);
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const l = list.current;
    // The list scrolls on its own only when open on a phone, where the reader is browsing it.
    if (nav.current && l && l.scrollHeight <= l.clientHeight) {
      keepMarkedInView(nav.current, l);
    }
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
      className={`toc sticky top-[calc(var(--header-h)+20px)] max-h-[calc(100dvh-var(--header-h)-32px)] overflow-y-auto overscroll-contain pt-1 pr-1 pb-4 pl-0 text-[0.88rem] max-md:top-(--header-h) max-md:z-10 max-md:mx-[calc(-1*var(--gutter))] max-md:-mt-5 max-md:mb-0 max-md:max-h-none max-md:overflow-visible max-md:border-b max-md:border-rule max-md:bg-surface max-md:px-(--gutter) max-md:py-0 ${open ? 'open' : ''}`}
      aria-label={t('methodology.toc')}
      onKeyDown={onKeyDown}
    >
      <h2 className="m-0 mb-2.5 text-[0.72rem] tracking-[0.08em] text-muted uppercase max-md:hidden">
        {t('methodology.toc')}
      </h2>
      <button
        ref={toggle}
        type="button"
        className="toc-toggle hidden cursor-pointer before:mr-[3px] before:ml-px before:h-[7px] before:w-[7px] before:-rotate-45 before:border-r-2 before:border-b-2 before:border-muted before:transition-transform before:duration-150 before:content-[''] aria-expanded:before:rotate-45 max-md:flex max-md:min-h-11 max-md:w-full max-md:min-w-0 max-md:items-center max-md:gap-2 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:font-bold max-md:text-ink"
        aria-expanded={open}
        aria-controls="toc-list"
        onClick={() => setOpen(!open)}
      >
        <span className="visually-hidden">{t('methodology.toc')}</span>
        <span className="toc-current overflow-hidden text-ellipsis whitespace-nowrap text-ink">
          {sections[active]?.title ?? ''}
        </span>
      </button>
      <ol
        ref={list}
        id="toc-list"
        className={`toc-list m-0 list-none border-l-2 border-rule p-0 [counter-reset:toc] ${open ? 'max-md:block max-md:max-h-[calc(100dvh-var(--header-h)-64px)] max-md:overflow-y-auto max-md:pb-3' : 'max-md:hidden'}`}
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
    <div className="methodology mx-auto grid max-w-[1400px] grid-cols-[260px_minmax(0,1fr)] items-start gap-12 max-md:block">
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
