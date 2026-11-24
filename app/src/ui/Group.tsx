import type { ReactNode } from 'react';
import type { WorthId } from '../app/worth';
import { SUMMARY } from './classes';
import { WorthPill } from './Worth';

export interface GroupProps {
  id: string;
  title: string;
  /** The one line under the title saying what is set, shown open or closed. */
  meta: string;
  worth?: WorthId;
  /** A 0% / 100% pair beside the summary, outside it, so its buttons neither open nor close it. */
  quick?: ReactNode;
  children: ReactNode;
}

/** With a 0% / 100% pair under the pill, the summary aligns to the top and the title gets room. */
const LOOK = {
  plain: { summary: 'items-center', title: '' },
  withQuick: { summary: 'items-start before:mt-2', title: 'leading-[1.4]' },
};

/**
 * A collapsible group of the panel: a native disclosure, so the keyboard and screen readers open
 * and close it; its summary holds the title, what is set, and what it is worth.
 */
export const Group = ({ id, title, meta, worth, quick, children }: GroupProps) => {
  const pill = worth ? <WorthPill id={worth} /> : null;
  const look = LOOK[quick ? 'withQuick' : 'plain'];
  const details = (
    <details
      className="group border-t border-rule [.panel>&:first-of-type]:border-t-0"
      data-group={id}
    >
      <summary className={`${SUMMARY} gap-2.5 py-2.5 ${look.summary}`}>
        <span className="group-head grid min-w-0 flex-auto">
          <span className={`group-title font-bold ${look.title}`}>{title}</span>
          <span className="group-meta text-[0.8rem] text-muted">{meta}</span>
        </span>
        {pill && quick ? (
          <span className="group-side flex w-[78px] flex-none justify-end pt-0.5">{pill}</span>
        ) : (
          pill
        )}
      </summary>
      <div className="group-body grid gap-3.5 pt-0.5 pb-4">{children}</div>
    </details>
  );
  return quick ? (
    <div className="group-wrap relative">
      {details}
      <span className="absolute top-[calc(10px+1.4rem+5px)] right-0 flex">{quick}</span>
    </div>
  ) : (
    details
  );
};
