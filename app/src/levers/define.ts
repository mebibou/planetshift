import type { LeverDef, OptionDef } from './types';

/** A lever of a module: a 0–100% slider, its texts at `levers.<module>.<id>.title|description`. */
export const lever = (module: string, id: string, key: string): LeverDef => ({
  id,
  key,
  default: 0,
  min: 0,
  max: 1,
  step: 0.01,
  unit: 'share',
  ui: {
    control: 'slider',
    label: `levers.${module}.${id}.title`,
    hint: `levers.${module}.${id}.description`,
    marks: [],
  },
});

/** An option of a module, its texts at `levers.<module>.options.<field>`. */
export const option = (
  module: string,
  field: string,
  key: string,
  values: readonly string[],
): OptionDef => ({ field, key, values, texts: `levers.${module}.options.${field}` });

/** Whether any of the levers is adopted. */
export const anyAdopted = (
  adoption: (id: string) => number,
  levers: readonly { id: string }[],
): boolean => levers.some((l) => adoption(l.id) > 0);
