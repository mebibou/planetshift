import { withFamily, withLever } from '../controls/adoption';
import { adoptedCount } from '../controls/panelModel';
import { formatPercent } from '../i18n/format';
import type { T } from '../i18n/i18n';
import { adoptionOf, type LeverId } from '../levers/registry';
import type { LeverSpec } from '../levers/types';
import type { Options, Scenario } from '../model/api';
import type { PanelProps } from './DietGroup';
import { Group } from './Group';
import { Info } from './Info';
import { QuickPair } from './QuickPair';
import { Slider } from './Slider';
import { WorthPill } from './Worth';
import { HINT, HINT_TEXT, LEVER, LEVER_FOOT, LINK_BUTTON } from './classes';

export interface LeverGroupProps extends PanelProps {
  module: LeverSpec;
  available: (id: LeverId) => boolean;
  options?: Options;
}

const ADOPTED = { of: 'levers.adoptedOf', none: 'levers.noneAdopted' };

/** What is adopted of a module's levers, for its group's summary line, in its own words if any. */
const metaOf = (t: T, count: number, total: number, own?: string): string => {
  const keys = own ? { of: `${own}.of`, none: `${own}.none` } : ADOPTED;
  return total === 1
    ? t(count > 0 ? 'levers.adoptedOne' : 'levers.notAdopted')
    : t(count > 0 ? keys.of : keys.none, { count, total });
};

const LeverSlider = ({
  t,
  locale,
  scenario,
  setScenario,
  lever,
  on,
  note = 'levers.noData',
}: Omit<LeverGroupProps, 'module' | 'available'> & {
  lever: LeverSpec['levers'][number];
  on: boolean;
  /** Why it cannot act, when it cannot. */
  note?: string;
}) => {
  const { id, min, max, step, ui } = lever;
  const pct = (v: number) => formatPercent(locale, v / 100);
  return (
    <div className={LEVER} data-lever={id}>
      <Slider
        id={`lever-${id}`}
        label={t(ui.label)}
        min={min * 100}
        max={max * 100}
        step={step * 100}
        value={Math.round(adoptionOf(scenario.levers, id) * 100)}
        format={pct}
        marks={ui.marks.map((v) => ({ value: v * 100, label: pct(v * 100) }))}
        info={<Info label={t('controls.info', { name: t(ui.label) })} text={t(ui.hint)} />}
        disabled={!on}
        onChange={(v) => setScenario((s: Scenario) => withLever(s, id, v / 100))}
      />
      <div className={LEVER_FOOT}>
        {on ? <WorthPill id={`lever:${id}`} /> : <p className={`${HINT_TEXT} m-0`}>{t(note)}</p>}
      </div>
    </div>
  );
};

/** One group per lever module, closed at first, a 0–100% adoption slider per lever. */
export const LeverGroup = ({ module, available, ...props }: LeverGroupProps) => {
  const { t, locale, scenario, setScenario } = props;
  const title = t(`levers.${module.id}.title`);
  const blocked = (props.options && module.ui.blocked?.(props.options)) ?? null;
  const button = (label: string, adoption: number) => (
    <button
      type="button"
      className={LINK_BUTTON}
      data-action={adoption > 0 ? 'max' : 'reset'}
      onClick={() => setScenario((s) => withFamily(s, module, adoption))}
    >
      {label}
    </button>
  );
  return (
    <Group
      id={`levers-${module.id}`}
      title={title}
      meta={metaOf(t, adoptedCount(scenario.levers, module), module.levers.length, module.ui.meta)}
      worth={`family:${module.id}`}
      quick={
        <QuickPair
          ids={[module.id]}
          scope={module.id}
          locale={locale}
          scenario={scenario}
          name={(value) => t('quick.group', { name: title, value })}
          setScenario={setScenario}
        />
      }
    >
      <p className={HINT}>{t(`levers.${module.id}.description`)}</p>
      {module.levers.map((lever) => (
        <LeverSlider
          key={lever.id}
          {...props}
          lever={lever}
          on={available(lever.id) && !blocked}
          note={blocked ?? undefined}
        />
      ))}
      <div className="lever-actions mb-2 flex flex-wrap gap-4">
        {button(t('levers.maxAll'), 1)}
        {button(t('levers.reset'), 0)}
      </div>
    </Group>
  );
};
