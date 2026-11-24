import { changedOptions, optionValue } from '../controls/panelModel';
import type { T } from '../i18n/i18n';
import type { Options } from '../model/api';
import { OPTIONS } from '../model/options';
import { Group } from './Group';
import { Info } from './Info';
import { Segmented } from './Segmented';
import { HINT } from './classes';

/** The UN projection, which the people-on-Earth number replaces while it is set. */
const replaced = (options: Options, field: string): boolean =>
  field === 'population' && options.people !== undefined;

/** The Other options group: the core's options, then the lever modules', each a switch. */
export const OptionsGroup = ({
  t,
  options,
  setOptions,
}: {
  t: T;
  options: Options;
  setOptions: (change: (o: Options) => Options) => void;
}) => {
  const count = changedOptions(options);
  return (
    <Group
      id="options"
      title={t('options.title')}
      meta={count > 0 ? t('options.changed', { count }) : t('options.defaults')}
    >
      <p className={HINT}>{t('options.intro')}</p>
      {OPTIONS.filter((o) => !replaced(options, o.field)).map(({ field, values, texts }) => (
        <Segmented<string>
          key={field}
          name={`option-${field}`}
          legend={t(`${texts}.label`)}
          options={values.map((v) => ({ value: v, label: t(`${texts}.${v}`) }))}
          value={optionValue(options, field)}
          info={
            <Info
              label={t('controls.info', { name: t(`${texts}.label`) })}
              text={t(`${texts}.hint`)}
            />
          }
          onChange={(v) => setOptions((o) => ({ ...o, [field]: v }))}
        />
      ))}
    </Group>
  );
};
