import { useSyncExternalStore } from 'react';
import type { T } from '../i18n/i18n';
import { UPDATES, type Updates } from '../app/offline';
import { POPUP_SHADOW } from './classes';

/** Says a new version is ready, in a live region that is on the page before it has anything to say. */
export const UpdatePrompt = ({ t, updates = UPDATES }: { t: T; updates?: Updates }) => {
  const state = useSyncExternalStore(updates.subscribe, updates.state, updates.state);
  return (
    <div
      role="status"
      className="update-prompt fixed right-(--gutter) bottom-4 z-20 max-w-[min(26rem,calc(100vw-2*var(--gutter)))] empty:hidden"
    >
      {state === 'waiting' && (
        <div
          className={`flex items-center gap-3 rounded-card border border-rule bg-surface py-2 pr-2 pl-4 text-[0.9rem] text-ink ${POPUP_SHADOW}`}
        >
          <p className="m-0">{t('update.available')}</p>
          <button
            type="button"
            className="min-h-9 cursor-pointer rounded-md border-0 bg-accent px-3 font-bold text-accent-ink"
            onClick={updates.reload}
          >
            {t('update.reload')}
          </button>
          <button
            type="button"
            className="min-h-9 min-w-9 cursor-pointer rounded-md border-0 bg-transparent text-[1.1rem] text-muted hover:bg-surface-2"
            aria-label={t('update.dismiss')}
            onClick={updates.dismiss}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
