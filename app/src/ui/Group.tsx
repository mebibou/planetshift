import type { ReactNode } from 'react';
import type { WorthId } from '../app/worth';
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

/**
 * A collapsible group of the panel: a native disclosure, so the keyboard and screen readers open
 * and close it; its summary holds the title, what is set, and what it is worth.
 */
export const Group = ({ id, title, meta, worth, quick, children }: GroupProps) => {
  const pill = worth ? <WorthPill id={worth} /> : null;
  const details = (
    <details className="group" data-group={id}>
      <summary>
        <span className="group-head">
          <span className="group-title">{title}</span>
          <span className="group-meta">{meta}</span>
        </span>
        {pill && quick ? <span className="group-side">{pill}</span> : pill}
      </summary>
      <div className="group-body">{children}</div>
    </details>
  );
  return quick ? (
    <div className="group-wrap">
      {details}
      {quick}
    </div>
  ) : (
    details
  );
};
