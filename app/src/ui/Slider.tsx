import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useLatest } from './useLatest';

export interface SliderProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  /** Values marked under the track, with their labels. */
  marks?: { value: number; label: string }[];
  /** An (i) beside the label, explaining the slider. */
  info?: ReactNode;
  disabled?: boolean;
  onChange: (v: number) => void;
}

const position = (value: number, min: number, max: number) =>
  `${((value - min) / (max - min)) * 100}%`;

const noop = () => {};

/**
 * A range slider. It listens to the input's own `input` event rather than React's `onChange`, so
 * a value set from outside (a test, an extension) moves it too.
 */
export const Slider = (p: SliderProps) => {
  const { id, label, min, max, step, value, format, marks = [], info, disabled } = p;
  const input = useRef<HTMLInputElement>(null);
  const onChange = useLatest(p.onChange);
  useEffect(() => {
    const el = input.current;
    const listener = () => el && onChange.current(Number(el.value));
    el?.addEventListener('input', listener);
    return () => el?.removeEventListener('input', listener);
  }, [onChange]);
  const listId = `${id}-marks`;
  return (
    <div className="slider">
      <div className="slider-head">
        <span className="slider-label">
          <label htmlFor={id}>{label}</label>
          {info}
        </span>
        <output htmlFor={id} className="slider-value">
          {format(value)}
        </output>
      </div>
      <input
        ref={input}
        type="range"
        id={id}
        name={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={noop}
        disabled={disabled}
        list={marks.length ? listId : undefined}
        aria-valuetext={format(value)}
        style={{ '--fill': position(value, min, max) } as CSSProperties}
      />
      {marks.length > 0 && (
        <>
          <datalist id={listId}>
            {marks.map((m) => (
              <option key={m.value} value={m.value} />
            ))}
          </datalist>
          <div className="slider-marks" aria-hidden="true">
            {marks.map((m) => (
              <span key={m.value} style={{ left: position(m.value, min, max) }}>
                {m.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
