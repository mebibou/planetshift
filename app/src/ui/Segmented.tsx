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
}

/** A labelled group of radio buttons drawn as a switch: arrow keys move between them. */
export const Segmented = <V extends string>(p: SegmentedProps<V>) => (
  <fieldset className="segmented" data-control={p.name} hidden={p.hidden}>
    <legend>
      {p.legend}
      {p.info}
    </legend>
    <div className="segmented-options">
      {p.options.map((o) => (
        <label key={o.value} htmlFor={`${p.name}-${o.value}`}>
          <input
            type="radio"
            name={p.name}
            value={o.value}
            id={`${p.name}-${o.value}`}
            checked={o.value === p.value}
            onChange={() => p.onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);
