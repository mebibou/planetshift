import { useEffect, useId, useRef } from 'react';
import { placeBelow } from '../app/place';

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * An (i) button showing `text` in a popover: a click, a tap or Enter opens it, and a click
 * elsewhere or Escape closes it. A scroll closes it too, as it would leave the button behind.
 * `label` names the button for screen readers.
 */
export const Info = ({ label, text }: { label: string; text: string }) => {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tip.current;
    const close = () => el?.hidePopover();
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === 'open';
      if (open && el && button.current) {
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
    <span className="info-wrap">
      <button ref={button} type="button" className="info" popoverTarget={id} aria-label={label}>
        i
      </button>
      <div ref={tip} id={id} className="info-tip" popover="auto" role="tooltip">
        {text}
      </div>
    </span>
  );
};
