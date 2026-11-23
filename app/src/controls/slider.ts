import { h } from '../app/dom';

export interface SliderSpec {
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
  info?: Node | null;
  onInput: (v: number) => void;
}

export interface Control<V> {
  el: HTMLElement;
  set: (value: V) => void;
}

const position = (value: number, min: number, max: number) =>
  `${((value - min) / (max - min)) * 100}%`;

export const slider = (spec: SliderSpec): Control<number> => {
  const { id, label, min, max, step, value, format, marks = [], info, onInput } = spec;
  const output = h('output', { for: id, class: 'slider-value' }, format(value));
  const listId = `${id}-marks`;
  const input = h('input', {
    type: 'range',
    id,
    name: id,
    min,
    max,
    step,
    value,
    list: marks.length ? listId : undefined,
    'aria-valuetext': format(value),
    oninput: (e: Event) => onInput(Number((e.target as HTMLInputElement).value)),
  });
  const set = (v: number) => {
    if (Number(input.value) !== v) input.value = String(v);
    output.textContent = format(v);
    input.setAttribute('aria-valuetext', format(v));
    input.style.setProperty('--fill', position(v, min, max));
  };
  set(value);
  return {
    el: h(
      'div',
      { class: 'slider' },
      h(
        'div',
        { class: 'slider-head' },
        h('span', { class: 'slider-label' }, h('label', { for: id }, label), info ?? null),
        output,
      ),
      input,
      marks.length
        ? h('datalist', { id: listId }, ...marks.map((m) => h('option', { value: m.value })))
        : null,
      marks.length
        ? h(
            'div',
            { class: 'slider-marks', 'aria-hidden': 'true' },
            ...marks.map((m) =>
              h('span', { style: `left: ${position(m.value, min, max)}` }, m.label),
            ),
          )
        : null,
    ),
    set,
  };
};
