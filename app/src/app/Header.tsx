import { useEffect, useRef, type MouseEvent } from 'react';
import { LANGS, type Lang, type T } from '../i18n/i18n';
import { PlanetMark } from './Logo';
import type { Theme } from './theme';
import { NAV_VIEWS, type View } from './url';

export interface HeaderProps {
  t: T;
  lang: Lang;
  view: View;
  theme: Theme;
  go: (view: View) => void;
  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
}

/**
 * Keeps `--header-h` at the header's height while it is sticky (wide screens), so the sticky
 * panels below it fit the rest of the window; 0 when it scrolls away with the page.
 */
const useHeaderHeight = (ref: React.RefObject<HTMLElement | null>) =>
  useEffect(() => {
    const el = ref.current;
    const update = () =>
      el &&
      document.documentElement.style.setProperty(
        '--header-h',
        getComputedStyle(el).position === 'sticky' ? `${el.offsetHeight}px` : '0px',
      );
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (el) {
      observer?.observe(el);
    }
    window.addEventListener('resize', update);
    update();
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref]);

const follow = (go: () => void) => (e: MouseEvent) => {
  e.preventDefault();
  go();
};

export const Header = ({ t, lang, view, theme, go, setLang, toggleTheme }: HeaderProps) => {
  const ref = useRef<HTMLElement>(null);
  useHeaderHeight(ref);
  return (
    <header
      className="site-header flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule bg-surface px-(--gutter) py-3.5 lg:sticky lg:top-0 lg:z-20"
      ref={ref}
    >
      <div className="brand mr-auto flex flex-wrap items-center gap-3">
        <a
          href="?"
          className="wordmark inline-flex items-center gap-2 text-[1.45rem] font-black tracking-[-0.03em] text-ink no-underline"
          onClick={follow(() => go('explore'))}
        >
          <PlanetMark />
          Planetshift
        </a>
        <p className="tagline m-0 text-[0.95rem] text-muted">{t('header.tagline')}</p>
      </div>
      <nav className="site-nav flex gap-1" aria-label={t('header.nav')}>
        {NAV_VIEWS.map((v) => (
          <a
            key={v}
            href={`?view=${v}`}
            data-view={v}
            aria-current={v === view ? 'page' : undefined}
            className="rounded-full px-3 py-1.5 font-bold text-ink no-underline hover:bg-surface-2 aria-[current=page]:bg-ink aria-[current=page]:text-surface"
            onClick={follow(() => go(v))}
          >
            {t(`nav.${v}`)}
          </a>
        ))}
      </nav>
      <div className="header-tools flex items-center gap-2">
        <div
          className="lang inline-flex overflow-hidden rounded-full border border-rule"
          role="group"
          aria-label={t('header.language')}
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              data-lang={l}
              aria-pressed={l === lang}
              className="min-h-8 cursor-pointer border-0 bg-transparent px-2.5 py-1 text-[0.85rem] font-bold aria-pressed:bg-accent aria-pressed:text-accent-ink"
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="theme-toggle grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-rule bg-surface"
          aria-pressed={theme === 'dark'}
          title={t('header.darkTheme')}
          onClick={toggleTheme}
        >
          <span
            className="theme-icon h-4 w-4 rounded-full bg-[linear-gradient(90deg,var(--ink)_50%,transparent_50%)] shadow-[0_0_0_1.5px_var(--ink)]"
            aria-hidden="true"
          />
          <span className="visually-hidden">{t('header.darkTheme')}</span>
        </button>
      </div>
    </header>
  );
};
