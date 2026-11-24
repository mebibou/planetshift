import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
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
  /** Chrome draws its own ticks for a datalist; off where the marks are drawn as ticks already. */
  nativeTicks?: boolean;
  /** An (i) beside the label, explaining the slider. */
  info?: ReactNode;
  disabled?: boolean;
  /** What a screen reader says of a value, `format` by default. */
  valueText?: (v: number) => string;
  /** Keys handled in place of the input's own steps (a value of `undefined` leaves them). */
  keyValue?: (key: string, value: number) => number | undefined;
  onChange: (v: number) => void;
}

const position = (value: number, min: number, max: number) =>
  `${((value - min) / (max - min)) * 100}%`;

const noop = () => {};

/**
 * A range slider. It listens to the input's own `input` event rather than React's `onChange`, so
 * a value set from outside (a test, an extension) moves it too.
 */
const nativeList = (p: SliderProps): string | undefined =>
  p.marks?.length && p.nativeTicks !== false ? `${p.id}-marks` : undefined;

export const Slider = (p: SliderProps) => {
  const { id, label, min, max, step, value, format, marks = [], info, disabled, keyValue } = p;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const next = keyValue?.(e.key, value);
    if (next !== undefined) {
      e.preventDefault();
      onChange.current(Math.min(max, Math.max(min, next)));
    }
  };
  const input = useRef<HTMLInputElement>(null);
  const onChange = useLatest(p.onChange);
  useEffect(() => {
    const el = input.current;
    const listener = () => el && onChange.current(Number(el.value));
    el?.addEventListener('input', listener);
    return () => el?.removeEventListener('input', listener);
  }, [onChange]);
  const listId = nativeList(p);
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
        list={listId}
        onKeyDown={keyValue && onKeyDown}
        aria-valuetext={(p.valueText ?? format)(value)}
        style={{ '--fill': position(value, min, max) } as CSSProperties}
      />
      <Marks marks={marks} min={min} max={max} listId={listId} />
    </div>
  );
};

const Marks = ({
  marks,
  min,
  max,
  listId,
}: {
  marks: NonNullable<SliderProps['marks']>;
  min: number;
  max: number;
  listId: string | undefined;
}) => (
  <>
    {listId && (
      <datalist id={listId}>
        {marks.map((m) => (
          <option key={m.value} value={m.value} />
        ))}
      </datalist>
    )}
    <div className="slider-marks" aria-hidden="true">
      {marks.map((m) => (
        <span key={m.value} style={{ left: position(m.value, min, max) }}>
          {m.label}
        </span>
      ))}
    </div>
  </>
);
