import { useEffect, useRef, type MouseEvent } from 'react';
import { LANGS, type Lang, type T } from '../i18n/i18n';
import { PlanetMark } from './Logo';
import type { Theme } from './theme';
import { VIEWS, type View } from './url';

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
    <header className="site-header" ref={ref}>
      <div className="brand">
        <a href="?" className="wordmark" onClick={follow(() => go('explore'))}>
          <PlanetMark />
          Planetshift
        </a>
        <p className="tagline">{t('header.tagline')}</p>
      </div>
      <nav className="site-nav" aria-label={t('header.nav')}>
        {VIEWS.map((v) => (
          <a
            key={v}
            href={`?view=${v}`}
            data-view={v}
            aria-current={v === view ? 'page' : undefined}
            onClick={follow(() => go(v))}
          >
            {t(`nav.${v}`)}
          </a>
        ))}
      </nav>
      <div className="header-tools">
        <div className="lang" role="group" aria-label={t('header.language')}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              data-lang={l}
              aria-pressed={l === lang}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={theme === 'dark'}
          title={t('header.darkTheme')}
          onClick={toggleTheme}
        >
          <span className="theme-icon" aria-hidden="true" />
          <span className="visually-hidden">{t('header.darkTheme')}</span>
        </button>
      </div>
    </header>
  );
};
