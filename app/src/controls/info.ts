import { h, uid } from '../app/dom';
import { placeBelow } from '../app/place';

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

/** Sets the open tip beside its button; a scroll closes it, as it would leave the button behind. */
const onToggle = (button: HTMLElement, tip: HTMLElement) => (e: Event) => {
  const open = (e as ToggleEvent).newState === 'open';
  const close = () => tip.hidePopover();
  if (open) {
    const { left, top } = placeBelow(
      button.getBoundingClientRect(),
      tip.getBoundingClientRect(),
      viewport(),
    );
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  window[open ? 'addEventListener' : 'removeEventListener']('scroll', close, { capture: true });
};

/**
 * An (i) button showing `text` in a popover: a click, a tap or Enter opens it, and a click
 * elsewhere or Escape closes it. `label` names the button for screen readers.
 */
export const info = (label: string, text: string): HTMLElement => {
  const id = uid('info');
  const tip = h('div', { id, class: 'info-tip', popover: 'auto', role: 'tooltip' }, text);
  const button = h(
    'button',
    { type: 'button', class: 'info', popovertarget: id, 'aria-label': label },
    'i',
  );
  tip.addEventListener('toggle', onToggle(button, tip));
  return h('span', { class: 'info-wrap' }, button, tip);
};
