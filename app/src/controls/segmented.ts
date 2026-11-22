import { h } from '../app/dom';
import type { Control } from './slider';

export interface SegmentedSpec<V extends string> {
  name: string;
  legend: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  hint?: string;
}

/** A labelled group of radio buttons drawn as a switch: arrow keys move between them. */
export const segmented = <V extends string>(spec: SegmentedSpec<V>): Control<V> => {
  const { name, legend, options, value, onChange, hint } = spec;
  const inputs = options.map((o) =>
    h('input', {
      type: 'radio',
      name,
      value: o.value,
      id: `${name}-${o.value}`,
      checked: o.value === value,
      onchange: () => onChange(o.value),
    }),
  );
  return {
    el: h(
      'fieldset',
      { class: 'segmented', 'data-control': name },
      h('legend', {}, legend),
      h(
        'div',
        { class: 'segmented-options' },
        ...options.map((o, i) =>
          h('label', { for: `${name}-${o.value}` }, inputs[i] ?? null, h('span', {}, o.label)),
        ),
      ),
      hint ? h('p', { class: 'hint' }, hint) : null,
    ),
    set: (v) => inputs.forEach((input) => (input.checked = input.value === v)),
  };
};
