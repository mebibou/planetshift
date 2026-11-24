import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { SLIDER_HEAD, SLIDER_LABEL, SLIDER_NAME, SLIDER_VALUE } from './classes';
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
  /** Under a head of its own: no head, and its marks drawn as ticks. */
  headless?: boolean;
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
    <div className="slider relative grid gap-1 pb-1">
      <div className={p.headless ? 'hidden' : SLIDER_HEAD}>
        <span className={SLIDER_LABEL}>
          <label htmlFor={id} className={SLIDER_NAME}>
            {label}
          </label>
          {info}
        </span>
        <output htmlFor={id} className={SLIDER_VALUE}>
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
        className="m-0 mt-1.5 h-7 w-full accent-accent disabled:cursor-not-allowed disabled:opacity-45"
      />
      <Marks marks={marks} min={min} max={max} listId={listId} ticks={p.headless} />
    </div>
  );
};

const Marks = ({
  marks,
  min,
  max,
  listId,
  ticks,
}: {
  marks: NonNullable<SliderProps['marks']>;
  min: number;
  max: number;
  listId: string | undefined;
  ticks?: boolean;
}) => (
  <>
    {listId && (
      <datalist id={listId}>
        {marks.map((m) => (
          <option key={m.value} value={m.value} />
        ))}
      </datalist>
    )}
    <div
      className={`slider-marks relative mx-[9px] text-[0.72rem] text-muted ${ticks ? 'h-1.5' : 'h-[1.1em]'}`}
      aria-hidden="true"
    >
      {marks.map((m) => (
        <span
          key={m.value}
          style={{ left: position(m.value, min, max) }}
          className={`absolute -translate-x-1/2 whitespace-nowrap ${ticks ? 'top-0 h-1.5 w-px bg-current' : ''}`}
        >
          {m.label}
        </span>
      ))}
    </div>
  </>
);
