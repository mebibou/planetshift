import '../app/tour.css';
import { useEffect, useRef, useState } from 'react';
import { storeTourSeen, TOUR_STEPS } from '../app/tour';
import type { T } from '../i18n/i18n';

const LAST = TOUR_STEPS.length - 1;

/** The guided start: a modal dialog of three steps, remembered as seen however it is closed. */
export const Tour = ({ t }: { t: T }) => {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    // React focuses autoFocus before showModal, which moves focus to the first button.
    next.current?.focus();
  }, []);
  const close = () => {
    storeTourSeen();
    setOpen(false);
  };
  const go = (to: number) => {
    setStep(Math.min(Math.max(to, 0), LAST));
    if (to <= 0) next.current?.focus();
  };
  const id = TOUR_STEPS[step];
  return open ? (
    <dialog
      ref={dialog}
      className="tour"
      aria-labelledby="tour-label"
      aria-describedby="tour-title tour-body"
      onCancel={storeTourSeen}
      onClose={close}
    >
      <p id="tour-label" className="tour-label">
        {t('tour.label')}
      </p>
      <div aria-live="polite">
        <p className="tour-progress">
          {t('tour.progress', { n: step + 1, total: TOUR_STEPS.length })}
        </p>
        <h2 id="tour-title" className="tour-title">
          {t(`tour.steps.${id}.title`)}
        </h2>
        <p id="tour-body" className="tour-body">
          {t(`tour.steps.${id}.text`)}
        </p>
      </div>
      <div className="tour-actions">
        <button
          type="button"
          className="link-button tour-skip"
          onClick={() => dialog.current?.close()}
        >
          {t('tour.skip')}
        </button>
        <button
          type="button"
          className="tour-button"
          hidden={step === 0}
          onClick={() => go(step - 1)}
        >
          {t('tour.back')}
        </button>
        <button
          ref={next}
          type="button"
          className="tour-button tour-next"
          onClick={() => (step === LAST ? dialog.current?.close() : go(step + 1))}
        >
          {step === LAST ? t('tour.done') : t('tour.next')}
        </button>
      </div>
    </dialog>
  ) : null;
};
