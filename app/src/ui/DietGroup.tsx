import { DIET_GROUP } from '../controls/adoption';
import { dietMeta, withGroupShift, withShift } from '../controls/panelModel';
import { ANIMAL_GROUPS } from '../data/types';
import { formatPercent } from '../i18n/format';
import type { T } from '../i18n/i18n';
import type { Basis, Replacement, Scenario, Where } from '../model/api';
import { Group } from './Group';
import { QuickPair } from './QuickPair';
import { Segmented } from './Segmented';
import { Slider } from './Slider';
import { WorthPill } from './Worth';

export interface PanelProps {
  t: T;
  locale: string;
  scenario: Scenario;
  setScenario: (change: (s: Scenario) => Scenario) => void;
}

const MAIN_MARKS = [0, 10, 25, 50, 75, 100];

const pct = (locale: string) => (v: number) => formatPercent(locale, v / 100);

/** One of the diet's switches: its legend and values from `controls.<field>` texts. */
const choice = <V extends string>(t: T, field: string, values: readonly V[]) => ({
  name: field,
  legend: t(`controls.${field}.label`),
  options: values.map((v) => ({ value: v, label: t(`controls.${field}.${v}`) })),
});

/** The animal foods set apart from the main shift, each with its own slider. */
const FoodShifts = ({ t, locale, scenario, setScenario }: PanelProps) => (
  <details className="fold" data-fold="advanced">
    <summary>{t('controls.advanced')}</summary>
    <p className="hint">{t('controls.groupsHint')}</p>
    {ANIMAL_GROUPS.map((g) => (
      <div className="lever" key={g}>
        <Slider
          id={`group-${g}`}
          label={t(`groups.${g}`)}
          min={0}
          max={100}
          step={1}
          value={Math.round((scenario.groupShifts[g] ?? scenario.shift) * 100)}
          format={pct(locale)}
          onChange={(v) => setScenario((s) => withGroupShift(s, g, v / 100))}
        />
        <div className="lever-foot">
          <WorthPill id={`group:${g}`} />
        </div>
      </div>
    ))}
    <button
      type="button"
      className="link-button"
      onClick={() => setScenario((s) => ({ ...s, groupShifts: {} }))}
    >
      {t('controls.groupsReset')}
    </button>
  </details>
);

/**
 * The Diet group, a lever group like the others, closed at first: the main shift, then kept
 * equal, replacement, where and the per-group shifts.
 */
export const DietGroup = (props: PanelProps) => {
  const { t, locale, scenario, setScenario } = props;
  const meta = dietMeta(scenario);
  const set =
    <K extends keyof Scenario>(key: K) =>
    (v: Scenario[K]) =>
      setScenario((s) => ({ ...s, [key]: v }));
  return (
    <Group
      id={DIET_GROUP}
      title={t('diet.title')}
      meta={t(meta.key, {
        share: formatPercent(locale, meta.params.share),
        year: meta.params.year,
      })}
      worth="diet"
      quick={
        <QuickPair
          ids={[DIET_GROUP]}
          scope={DIET_GROUP}
          locale={locale}
          scenario={scenario}
          name={(value) => t('quick.group', { name: t('diet.title'), value })}
          setScenario={setScenario}
        />
      }
    >
      <p className="hint">{t('diet.description')}</p>
      <Slider
        id="shift"
        label={t('controls.shift')}
        min={0}
        max={100}
        step={1}
        value={Math.round(scenario.shift * 100)}
        format={pct(locale)}
        marks={MAIN_MARKS.map((v) => ({ value: v, label: pct(locale)(v) }))}
        onChange={(v) => setScenario((s) => withShift(s, v / 100))}
      />
      <Segmented<Basis>
        {...choice(t, 'basis', ['protein', 'kcal'] as const)}
        value={scenario.basis}
        onChange={set('basis')}
      />
      <Segmented<Replacement>
        {...choice(t, 'replacement', ['current', 'legumes', 'plantMilk'] as const)}
        value={scenario.replacement}
        onChange={set('replacement')}
      />
      <Segmented<Where>
        {...choice(t, 'where', ['world', 'highIncome'] as const)}
        value={scenario.where}
        onChange={set('where')}
      />
      <FoodShifts {...props} />
    </Group>
  );
};
