import { useEffect, useId, useRef } from 'react';
import { placeBelow } from '../app/place';
import { POPUP_SHADOW } from './classes';

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * An (i) button showing `text` in a popover: a click, a tap or Enter opens it, and a click
 * elsewhere or Escape closes it. A scroll closes it too, as it would leave the button behind.
 * `label` names the button for screen readers.
 */
export const Info = ({
  label,
  text,
  more,
}: {
  label: string;
  /** One paragraph, or several. */
  text: string | readonly string[];
  more?: { href: string; text: string };
}) => {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tip.current;
    const close = () => el?.hidePopover();
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === 'open';
      if (open && el && button.current) {
        el.style.left = '0px';
        el.style.top = '0px';
        const at = placeBelow(
          button.current.getBoundingClientRect(),
          el.getBoundingClientRect(),
          viewport(),
        );
        el.style.left = `${at.left}px`;
        el.style.top = `${at.top}px`;
        el.dataset.placed = '';
      }
      window[open ? 'addEventListener' : 'removeEventListener']('scroll', close, { capture: true });
    };
    // The toggle event comes a task after the popover opens: until it is placed, it stays unseen.
    const unplace = () => el && delete el.dataset.placed;
    el?.addEventListener('beforetoggle', unplace);
    el?.addEventListener('toggle', onToggle);
    return () => {
      el?.removeEventListener('beforetoggle', unplace);
      el?.removeEventListener('toggle', onToggle);
      window.removeEventListener('scroll', close, { capture: true });
    };
  }, []);
  return (
    <span className="info-wrap inline-flex align-middle">
      <button
        ref={button}
        type="button"
        className="info relative h-[18px] w-[18px] flex-none cursor-pointer rounded-full border border-rule bg-surface p-0 font-[Georgia,serif] text-[0.7rem] leading-none font-bold text-muted italic after:absolute after:-inset-2 after:content-[''] hover:border-muted hover:text-ink focus-visible:border-muted focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        popoverTarget={id}
        aria-label={label}
      >
        i
      </button>
      <div
        ref={tip}
        id={id}
        className={`info-tip fixed inset-auto m-0 w-max max-w-[min(300px,calc(100vw_-_2*var(--gutter)))] rounded-lg border border-rule bg-surface px-2.5 py-2 text-[0.82rem] leading-[1.4] font-normal text-ink ${POPUP_SHADOW} not-data-placed:invisible`}
        popover="auto"
        role="tooltip"
      >
        {typeof text === 'string'
          ? text
          : text.map((p) => (
              <p key={p} className="m-0 mt-1.5 first:mt-0">
                {p}
              </p>
            ))}
        {more && (
          <>
            {' '}
            <a href={more.href}>{more.text}</a>
          </>
        )}
      </div>
    </span>
  );
};
