import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import type { Options } from '../model/api';
import { OPTIONS } from '../model/options';
import { DEFAULT_OPTIONS } from '../model/options';
import { group } from './group';
import { info } from './info';
import { segmented } from './segmented';
import type { Control } from './slider';

const valueOf = (options: Options, field: string): string =>
  (options as unknown as Record<string, string>)[field] ?? '';

/** How many options differ from their default, for the group's summary line. */
export const changedOptions = (options: Options): number =>
  OPTIONS.filter((o) => valueOf(options, o.field) !== valueOf(DEFAULT_OPTIONS, o.field)).length;

/** The Other options group: the core's options, then the lever modules', each a switch. */
export const optionsPanel = (
  t: T,
  options: Options,
  setOptions: (change: (o: Options) => Options) => void,
): Control<Options> => {
  const controls = OPTIONS.map(({ field, values, texts }) => ({
    field,
    control: segmented<string>({
      name: `option-${field}`,
      legend: t(`${texts}.label`),
      options: values.map((v) => ({ value: v, label: t(`${texts}.${v}`) })),
      value: valueOf(options, field),
      info: info(t('controls.info', { name: t(`${texts}.label`) }), t(`${texts}.hint`)),
      onChange: (v) => setOptions((o) => ({ ...o, [field]: v })),
    }),
  }));
  const g = group(
    { id: 'options', title: t('options.title') },
    h('p', { class: 'hint' }, t('options.intro')),
    ...controls.map((c) => c.control.el),
  );
  const set = (o: Options) => {
    controls.forEach(({ field, control }) => control.set(valueOf(o, field)));
    const count = changedOptions(o);
    g.setMeta(count > 0 ? t('options.changed', { count }) : t('options.defaults'));
  };
  set(options);
  return { el: g.el, set };
};
