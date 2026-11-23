import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface DownloadMenuProps {
  label: string;
  /** What a screen reader says for the button, when it says more than its label. */
  name?: string;
  className?: string;
  items: MenuItem[];
}

const itemsOf = (menu: HTMLElement | null) => [
  ...(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
];

/** The item a key moves the focus to, wrapping around; null for any other key. */
const MOVES: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/**
 * A Download button opening a menu of formats (the menu-button pattern): Enter, Space or the
 * down arrow opens it on its first item, the arrows move, Escape, Tab or a click elsewhere close it.
 */
export const DownloadMenu = ({ label, name = label, className = '', items }: DownloadMenuProps) => {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const id = useId();
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!button.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    if (open) itemsOf(menu.current)[0]?.focus();
    if (open) document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const onMenuKey = (e: KeyboardEvent) => {
    const list = itemsOf(menu.current);
    const move = MOVES[e.key];
    if (move) {
      e.preventDefault();
      list[move(list.indexOf(document.activeElement as HTMLButtonElement), list.length)]?.focus();
    }
    if (e.key === 'Escape') close(true);
    if (e.key === 'Tab') close(false);
  };
  return (
    <span className="download-menu">
      <button
        ref={button}
        type="button"
        className={`download-button ${className}`.trim()}
        aria-label={name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), setOpen(true))}
      >
        <Icon name="download" />
        <span>{label}</span>
      </button>
      <ul
        ref={menu}
        id={id}
        role="menu"
        className="download-menu-list"
        hidden={!open}
        onKeyDown={onMenuKey}
      >
        {items.map((item) => (
          <li key={item.id} role="none">
            <button
              type="button"
              role="menuitem"
              data-format={item.id}
              tabIndex={-1}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </span>
  );
};
