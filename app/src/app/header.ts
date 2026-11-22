import { planetMark } from './logo';
import { h } from './dom';
import type { Lang, T } from '../i18n/i18n';
import { LANGS } from '../i18n/i18n';
import type { Theme } from './theme';
import { VIEWS, type View } from './url';

export interface HeaderActions {
  go: (view: View) => void;
  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
}

export interface Header {
  el: HTMLElement;
  set: (view: View, theme: Theme) => void;
}

/**
 * Keeps `--header-h` at the header's height while it is sticky (wide screens), so the sticky
 * panels below it fit the rest of the window; 0 when it scrolls away with the page.
 */
const trackHeight = (el: HTMLElement): HTMLElement => {
  const update = () =>
    el.isConnected &&
    document.documentElement.style.setProperty(
      '--header-h',
      getComputedStyle(el).position === 'sticky' ? `${el.offsetHeight}px` : '0px',
    );
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(el);
  window.addEventListener('resize', update);
  return el;
};

export const header = (t: T, lang: Lang, actions: HeaderActions): Header => {
  const links = VIEWS.map((v) =>
    h(
      'a',
      {
        href: `?view=${v}`,
        'data-view': v,
        onclick: (e: Event) => {
          e.preventDefault();
          actions.go(v);
        },
      },
      t(`nav.${v}`),
    ),
  );
  const theme = h(
    'button',
    {
      type: 'button',
      class: 'theme-toggle',
      'aria-pressed': 'false',
      onclick: actions.toggleTheme,
    },
    h('span', { class: 'theme-icon', 'aria-hidden': 'true' }),
    h('span', { class: 'visually-hidden' }, t('header.darkTheme')),
  );
  theme.title = t('header.darkTheme');
  const langs = h(
    'div',
    { class: 'lang', role: 'group', 'aria-label': t('header.language') },
    ...LANGS.map((l) =>
      h(
        'button',
        {
          type: 'button',
          lang: l,
          'data-lang': l,
          'aria-pressed': String(l === lang),
          onclick: () => actions.setLang(l),
        },
        l.toUpperCase(),
      ),
    ),
  );
  return {
    el: trackHeight(
      h(
        'header',
        { class: 'site-header' },
        h(
          'div',
          { class: 'brand' },
          h(
            'a',
            {
              href: '?',
              class: 'wordmark',
              onclick: (e: Event) => (e.preventDefault(), actions.go('explore')),
            },
            planetMark(),
            'Planetshift',
          ),
          h('p', { class: 'tagline' }, t('header.tagline')),
        ),
        h('nav', { class: 'site-nav', 'aria-label': t('header.nav') }, ...links),
        h('div', { class: 'header-tools' }, langs, theme),
      ),
    ),
    set: (view, current) => {
      links.forEach((a) =>
        a.dataset.view === view
          ? a.setAttribute('aria-current', 'page')
          : a.removeAttribute('aria-current'),
      );
      theme.setAttribute('aria-pressed', String(current === 'dark'));
    },
  };
};
