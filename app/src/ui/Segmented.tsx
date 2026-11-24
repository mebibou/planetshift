import type { ReactNode } from 'react';

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

const STYLES = {
  normal: {
    fieldset: '',
    legend: 'mb-1.5',
    options: 'gap-1 p-[3px]',
    option: 'min-h-8 px-2.5 py-[5px] text-[0.86rem] leading-[22px]',
  },
  compact: {
    fieldset: 'flex items-center justify-between gap-2',
    /* A floated legend is laid out as a flex item, not drawn in the fieldset's border. */
    legend: 'float-left m-0',
    options: 'flex-none gap-0.5 p-0.5',
    option: 'min-h-0 px-2 py-0.5 text-[0.8rem] leading-5',
  },
};

/** A labelled group of radio buttons drawn as a switch: arrow keys move between them. */
export const Segmented = <V extends string>(p: SegmentedProps<V>) => {
  const s = STYLES[p.compact ? 'compact' : 'normal'];
  return (
    <fieldset
      className={`segmented m-0 min-w-0 border-0 p-0 ${s.fieldset}`}
      data-control={p.name}
      hidden={p.hidden}
    >
      <legend className={`flex items-center gap-1.5 p-0 text-[0.92rem] font-bold ${s.legend}`}>
        {p.legend}
        {p.info}
      </legend>
      <div className={`flex flex-wrap rounded-lg bg-surface-2 ${s.options}`}>
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
              className={`block rounded-md text-center peer-checked:font-bold peer-checked:text-ink peer-checked:bg-surface peer-checked:ring-1 peer-checked:ring-rule peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-focus ${s.option}`}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
