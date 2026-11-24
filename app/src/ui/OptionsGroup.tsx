import { optionValue } from '../controls/panelModel';
import type { T } from '../i18n/i18n';
import type { Options } from '../model/api';
import { OPTIONS } from '../model/options';
import { Info } from './Info';
import { Segmented } from './Segmented';
import { HINT } from './classes';

/** The UN projection, which the people-on-Earth number replaces while it is set. */
const replaced = (options: Options, field: string): boolean =>
  field === 'population' && options.people !== undefined;

/** The panel's Options view: the core's options, then the lever modules', each a switch. */
export const OptionsGroup = ({
  t,
  options,
  setOptions,
}: {
  t: T;
  options: Options;
  setOptions: (change: (o: Options) => Options) => void;
}) => {
  return (
    <section className="options grid gap-3.5" data-group="options" aria-label={t('options.title')}>
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
    </section>
  );
};
