/** Tailwind classes shared by several components. Each keeps its old name first, as a hook. */

export const HINT_TEXT = 'hint text-[0.8rem] text-muted';
export const HINT = `${HINT_TEXT} m-0 mt-1`;

export const SUMMARY =
  'chevron flex cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export const SLIDER_HEAD = 'slider-head flex items-baseline justify-between gap-2';
export const SLIDER_LABEL = 'slider-label inline-flex items-center gap-1.5';
export const SLIDER_NAME = 'text-[0.92rem] font-bold';
export const SLIDER_VALUE = 'slider-value font-bold tabular-nums';

export const LINK_BUTTON =
  'link-button cursor-pointer border-0 bg-transparent p-0 text-[0.85rem] text-accent underline';

export const FOLD =
  'fold border-t border-rule pt-2.5 [.group-body>&]:mt-0.5 [&>.segmented]:mb-3.5 [&>.slider]:mb-3.5';
export const FOLD_SUMMARY = `${SUMMARY} items-center gap-2.5 py-1 font-bold [[open]>&]:mb-2.5`;

/** A fold inside a group, inset so it reads as part of it rather than a group of its own. */
export const SUBFOLD =
  'fold subfold mt-2 border-0 border-l-2 border-solid border-rule py-0.5 pl-3 [&>.lever]:mb-3.5';
export const SUBFOLD_SUMMARY = `${SUMMARY} items-center gap-2 py-0.5 text-[0.88rem] font-semibold [[open]>&]:mb-1.5`;

export const LEVER_FOOT = 'lever-foot -mt-2.5 flex items-baseline gap-2 empty:hidden';

/** A lever: its slider and, close under it, its worth figure, set apart from the next lever. */
export const LEVER = 'lever pb-1.5';

export const POPUP_SHADOW = 'shadow-[0_4px_16px_color-mix(in_srgb,var(--ink)_14%,transparent)]';

export const TOOL_BUTTON =
  'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.88rem]';
export const OUTLINE_BUTTON = `${TOOL_BUTTON} border border-rule bg-surface text-ink`;
export const DOWNLOAD_BUTTON = `download-button ${OUTLINE_BUTTON} hover:bg-accent-soft`;

export const CHART_SUBTITLE = 'chart-subtitle m-0 mt-3 text-[1rem]';

export const SMALL_NOTE = 'text-[0.82rem] text-muted tabular-nums';

export const CARD = 'card min-w-0 rounded-card border border-rule bg-surface p-4';
export const MAP_CARD = `${CARD} map-card lg:[grid-area:map]`;

export const FIELD = 'field grid gap-1.5';
export const FIELD_LABEL = 'text-[0.92rem] font-bold';
