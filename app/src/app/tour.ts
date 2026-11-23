import { attempt } from './attempt';
import type { T } from '../i18n/i18n';
import { h } from './dom';
import type { View } from './url';
import './tour.css';

export const TOUR_STEPS = ['chart', 'levers', 'causes'] as const;

const KEY = 'planetshift.tour';
const SEEN = 'seen';

/** `?tour=1` opens the guided start whatever the browser remembers, `?tour=0` keeps it closed. */
export const parseTourFlag = (query: string): boolean | null => {
  const value = new URLSearchParams(query).get('tour');
  return value === '1' ? true : value === '0' ? false : null;
};

export const shouldShowTour = (flag: boolean | null, seen: boolean, view: View): boolean =>
  flag ?? (!seen && view === 'explore');

export const readTourSeen = (): boolean => attempt(() => localStorage.getItem(KEY) === SEEN, false);

export const storeTourSeen = (): void => {
  try {
    localStorage.setItem(KEY, SEEN);
  } catch {
    // storage unavailable: the guided start shows again on the next visit
  }
};

/** The guided start: a modal dialog of three steps, remembered as seen however it is closed. */
export const openTour = (t: T): HTMLDialogElement => {
  let step = 0;
  const last = TOUR_STEPS.length - 1;
  const progress = h('p', { class: 'tour-progress' });
  const title = h('h2', { id: 'tour-title', class: 'tour-title' });
  const body = h('p', { id: 'tour-body', class: 'tour-body' });
  const back = h('button', { type: 'button', class: 'tour-button', onclick: () => go(step - 1) });
  const next = h('button', {
    type: 'button',
    class: 'tour-button tour-next',
    autofocus: true,
    onclick: () => (step === last ? dismiss() : go(step + 1)),
  });
  const dialog = h(
    'dialog',
    {
      class: 'tour',
      'aria-labelledby': 'tour-label',
      'aria-describedby': 'tour-title tour-body',
      oncancel: storeTourSeen,
      onclose: () => {
        storeTourSeen();
        dialog.remove();
      },
    },
    h('p', { id: 'tour-label', class: 'tour-label' }, t('tour.label')),
    h('div', { 'aria-live': 'polite' }, progress, title, body),
    h(
      'div',
      { class: 'tour-actions' },
      h(
        'button',
        { type: 'button', class: 'link-button tour-skip', onclick: () => dismiss() },
        t('tour.skip'),
      ),
      back,
      next,
    ),
  );
  const dismiss = () => {
    storeTourSeen();
    dialog.close();
  };
  const render = () => {
    const id = TOUR_STEPS[step];
    progress.textContent = t('tour.progress', { n: step + 1, total: TOUR_STEPS.length });
    title.textContent = t(`tour.steps.${id}.title`);
    body.textContent = t(`tour.steps.${id}.text`);
    back.textContent = t('tour.back');
    back.hidden = step === 0;
    next.textContent = step === last ? t('tour.done') : t('tour.next');
  };
  const go = (to: number) => {
    step = Math.min(Math.max(to, 0), last);
    render();
    if (back.hidden && document.activeElement === back) next.focus();
  };
  render();
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
};
