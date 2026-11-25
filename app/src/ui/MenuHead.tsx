import type { ReactNode } from 'react';
import type { MenuId } from '../app/menus';
import type { T } from '../i18n/i18n';
import { TOOL_BUTTON } from './classes';
import { Icon } from './Icon';

export interface MenuHeadProps {
  t: T;
  id: MenuId;
  open: boolean;
  setOpen: (open: boolean) => void;
  controls: string;
  side: 'left' | 'right';
  /** The classes hiding the title once the closed menu is a thin rail beside the content. */
  rail: string;
  /** The classes putting the button first, on the content's side, once the menu sits on the right. */
  reverse?: string;
  title: ReactNode;
}

export const MENU_TOGGLE = `menu-toggle ${TOOL_BUTTON} min-w-9 flex-none justify-center border border-rule bg-surface px-0 text-muted hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-expanded:border-transparent aria-expanded:bg-transparent`;

/** A side menu's title and the button that collapses it, on the side facing the content. */
export const MenuHead = ({
  t,
  id,
  open,
  setOpen,
  controls,
  side,
  rail,
  reverse = '',
  title,
}: MenuHeadProps) => {
  const label = t(open ? 'menu.hide' : 'menu.show', { name: t(`menu.names.${id}`) });
  return (
    <div className={`menu-head flex items-center justify-between gap-2 ${reverse}`}>
      <span className={`min-w-0 ${open ? '' : rail}`}>{title}</span>
      <button
        type="button"
        className={MENU_TOGGLE}
        data-menu={id}
        aria-expanded={open}
        aria-controls={controls}
        aria-label={label}
        title={label}
        onClick={() => setOpen(!open)}
      >
        <Icon name={side === 'left' ? 'panelLeft' : 'panelRight'} />
      </button>
    </div>
  );
};
