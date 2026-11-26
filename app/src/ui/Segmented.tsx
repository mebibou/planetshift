import type { ReactNode } from 'react';
import { Steady } from './Steady';

export interface SegmentedProps<V extends string> {
  name: string;
  legend: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  /** An (i) beside the legend, explaining the choice. */
  info?: ReactNode;
  hidden?: boolean;
  /** On one line with its legend, with smaller options, as in the panel's time settings. */
  compact?: boolean;
}

const OPTION = {
  normal: 'min-h-8 px-2.5 py-[5px] text-[0.86rem] leading-[22px]',
  compact: 'min-h-0 px-2 py-0.5 text-[0.8rem] leading-5',
};

const Options = <V extends string>(p: SegmentedProps<V>) => (
  <div
    className={`flex rounded-lg bg-surface-2 ${p.compact ? 'flex-none flex-nowrap gap-0.5 p-0.5' : 'flex-wrap gap-1 p-[3px]'}`}
  >
    {p.options.map((o) => (
      <label
        key={o.value}
        htmlFor={`${p.name}-${o.value}`}
        className="relative flex-auto cursor-pointer"
      >
        <input
          type="radio"
          name={p.name}
          value={o.value}
          id={`${p.name}-${o.value}`}
          checked={o.value === p.value}
          onChange={() => p.onChange(o.value)}
          className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
        />
        <span
          className={`block rounded-md text-center peer-checked:font-bold peer-checked:text-ink peer-checked:bg-surface peer-checked:ring-1 peer-checked:ring-rule peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-focus ${OPTION[p.compact ? 'compact' : 'normal']}`}
        >
          <Steady text={o.label} />
        </span>
      </label>
    ))}
  </div>
);

const LABEL = 'flex items-center gap-1.5 p-0 text-[0.92rem] font-bold';

/*
 * On one line, the legend is for screen readers and a plain row draws the label: Safari does not
 * lay a legend out as a flex item, so it would sit on its own line above the options.
 */
const CompactBody = <V extends string>(p: SegmentedProps<V>) => (
  <>
    <legend className="sr-only">{p.legend}</legend>
    <div className="flex items-center justify-between gap-2">
      <span className={`${LABEL} shrink-0 whitespace-nowrap`}>
        <span aria-hidden="true">{p.legend}</span>
        {p.info}
      </span>
      <Options {...p} />
    </div>
  </>
);

const Body = <V extends string>(p: SegmentedProps<V>) => (
  <>
    <legend className={`${LABEL} mb-1.5`}>
      {p.legend}
      {p.info}
    </legend>
    <Options {...p} />
  </>
);

/** A labelled group of radio buttons drawn as a switch: arrow keys move between them. */
export const Segmented = <V extends string>(p: SegmentedProps<V>) => (
  <fieldset className="segmented m-0 min-w-0 border-0 p-0" data-control={p.name} hidden={p.hidden}>
    {p.compact ? <CompactBody {...p} /> : <Body {...p} />}
  </fieldset>
);
