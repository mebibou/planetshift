import { useEffect, useRef, useState } from 'react';
import { storeTourSeen, TOUR_STEPS } from '../app/tour';
import type { T } from '../i18n/i18n';
import { LINK_BUTTON } from './classes';

const TOUR_BUTTON =
  'tour-button min-h-9 cursor-pointer rounded-md border px-3.5 py-1.5 text-[0.88rem]';

const LAST = TOUR_STEPS.length - 1;

/** The guided start: a modal dialog of three steps, remembered as seen however it is closed. */
export const Tour = ({ t }: { t: T }) => {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
    // React focuses autoFocus before showModal, which moves focus to the first button.
    next.current?.focus();
  }, []);
  const close = () => {
    storeTourSeen();
    setOpen(false);
  };
  const go = (to: number) => {
    setStep(Math.min(Math.max(to, 0), LAST));
    if (to <= 0) {
      next.current?.focus();
    }
  };
  const id = TOUR_STEPS[step];
  return open ? (
    <dialog
      ref={dialog}
      className="tour max-h-[calc(100dvh-2*var(--gutter))] w-[min(30rem,calc(100vw-2*var(--gutter)))] overflow-auto rounded-card border border-rule bg-surface p-5 text-ink shadow-[0_12px_40px_rgb(0_0_0/25%)] backdrop:bg-[rgb(0_0_0/40%)]"
      aria-labelledby="tour-label"
      aria-describedby="tour-title tour-body"
      onCancel={storeTourSeen}
      onClose={close}
    >
      <p id="tour-label" className="tour-label m-0 text-[0.82rem] font-bold text-accent">
        {t('tour.label')}
      </p>
      <div aria-live="polite">
        <p className="tour-progress m-0 text-[0.82rem] text-muted">
          {t('tour.progress', { n: step + 1, total: TOUR_STEPS.length })}
        </p>
        <h2 id="tour-title" className="tour-title mt-2.5 mb-2">
          {t(`tour.steps.${id}.title`)}
        </h2>
        <p id="tour-body" className="tour-body leading-[1.5]">
          {t(`tour.steps.${id}.text`)}
        </p>
      </div>
      <div className="tour-actions mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${LINK_BUTTON} tour-skip mr-auto min-h-9`}
          onClick={() => dialog.current?.close()}
        >
          {t('tour.skip')}
        </button>
        <button
          type="button"
          className={`${TOUR_BUTTON} border-rule bg-surface text-ink hover:bg-accent-soft`}
          hidden={step === 0}
          onClick={() => go(step - 1)}
        >
          {t('tour.back')}
        </button>
        <button
          ref={next}
          type="button"
          className={`${TOUR_BUTTON} tour-next border-accent bg-accent font-bold text-accent-ink`}
          onClick={() => (step === LAST ? dialog.current?.close() : go(step + 1))}
        >
          {step === LAST ? t('tour.done') : t('tour.next')}
        </button>
      </div>
    </dialog>
  ) : null;
};
