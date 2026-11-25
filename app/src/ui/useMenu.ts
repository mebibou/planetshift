import { useState } from 'react';
import { isPhone, menuOpen, readMenu, storeMenu, type MenuId } from '../app/menus';

/** A side menu's open state, remembered by the browser; `onPhone` is how it opens on a phone. */
export const useMenu = (id: MenuId, onPhone = true) => {
  const [open, setOpen] = useState(() => menuOpen(readMenu(id), isPhone(), onPhone));
  const set = (next: boolean) => {
    storeMenu(id, next);
    setOpen(next);
  };
  return [open, set] as const;
};
