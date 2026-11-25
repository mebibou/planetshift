import { attempt } from './attempt';

export type MenuId = 'panel' | 'summary' | 'toc' | 'markers' | 'rates';

const key = (id: MenuId) => `planetshift.menu.${id}`;

export const parseMenu = (value: string | null | undefined): boolean | null =>
  value === 'open' ? true : value === 'closed' ? false : null;

/** Whether a side menu opens: as the reader last left it, else as it opens on this screen. */
export const menuOpen = (stored: boolean | null, phone: boolean, onPhone: boolean): boolean =>
  stored ?? (!phone || onPhone);

export const readMenu = (id: MenuId): boolean | null =>
  parseMenu(attempt(() => localStorage.getItem(key(id)), null));

export const storeMenu = (id: MenuId, open: boolean): void => {
  try {
    localStorage.setItem(key(id), open ? 'open' : 'closed');
  } catch {
    // storage unavailable: the menu stays as it is for this page only
  }
};

/** A phone's width, where the side menus run in the page's flow. */
export const isPhone = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
