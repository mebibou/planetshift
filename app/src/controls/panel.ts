import { h } from '../app/dom';
import { ANIMAL_GROUPS, type AnimalGroup } from '../data/types';
import type { T } from '../i18n/i18n';
import { formatPercent } from '../i18n/format';
import type { Basis, Replacement, Scenario, Where } from '../model/api';
import { DIET_GROUP } from './adoption';
import { group, worthPill } from './group';
import { quickPair } from './quick';
import { segmented } from './segmented';
import { slider, type Control } from './slider';

export interface PanelContext {
  t: T;
  locale: string;
  currentYear: number;
  scenario: Scenario;
  setScenario: (change: (s: Scenario) => Scenario) => void;
}

const pct = (locale: string) => (v: number) => formatPercent(locale, v / 100);

const MAIN_MARKS = [0, 10, 25, 50, 75, 100];

export const withShift = (s: Scenario, shift: number): Scenario => ({ ...s, shift });

export const withGroupShift = (s: Scenario, group: AnimalGroup, value: number): Scenario => ({
  ...s,
  groupShifts: { ...s.groupShifts, [group]: value },
});

/** What the Diet group's summary line says: no shift, or how much, and foods set apart. */
export const dietMeta = (s: Scenario): { key: string; params: { share: number; year: number } } => {
  const own = Object.values(s.groupShifts).some((v) => v !== undefined);
  const moved = s.shift > 0 || Object.values(s.groupShifts).some((v) => (v ?? 0) > 0);
  return {
    key: !moved ? 'diet.none' : own ? 'diet.movedOwn' : 'diet.moved',
    params: { share: s.shift, year: s.rampEnd },
  };
};

/**
 * The Diet group, a lever group like the others, closed at first: the main shift, then kept
 * equal, replacement, where and the per-group shifts.
 */
export const scenarioPanel = (ctx: PanelContext): Control<Scenario> => {
  const { t, locale, scenario, setScenario } = ctx;
  const main = slider({
    id: 'shift',
    label: t('controls.shift'),
    min: 0,
    max: 100,
    step: 1,
    value: Math.round(scenario.shift * 100),
    format: pct(locale),
    marks: MAIN_MARKS.map((v) => ({ value: v, label: pct(locale)(v) })),
    onInput: (v) => setScenario((s) => withShift(s, v / 100)),
  });
  const basis = segmented<Basis>({
    name: 'basis',
    legend: t('controls.basis.label'),
    options: (['protein', 'kcal'] as const).map((v) => ({
      value: v,
      label: t(`controls.basis.${v}`),
    })),
    value: scenario.basis,
    onChange: (basis) => setScenario((s) => ({ ...s, basis })),
  });
  const replacement = segmented<Replacement>({
    name: 'replacement',
    legend: t('controls.replacement.label'),
    options: (['current', 'legumes', 'plantMilk'] as const).map((v) => ({
      value: v,
      label: t(`controls.replacement.${v}`),
    })),
    value: scenario.replacement,
    onChange: (replacement) => setScenario((s) => ({ ...s, replacement })),
  });
  const where = segmented<Where>({
    name: 'where',
    legend: t('controls.where.label'),
    options: (['world', 'highIncome'] as const).map((v) => ({
      value: v,
      label: t(`controls.where.${v}`),
    })),
    value: scenario.where,
    onChange: (where) => setScenario((s) => ({ ...s, where })),
  });
  const groups = ANIMAL_GROUPS.map((g) => ({
    group: g,
    control: slider({
      id: `group-${g}`,
      label: t(`groups.${g}`),
      min: 0,
      max: 100,
      step: 1,
      value: Math.round((scenario.groupShifts[g] ?? scenario.shift) * 100),
      format: pct(locale),
      onInput: (v) => setScenario((s) => withGroupShift(s, g, v / 100)),
    }),
  }));
  const quick = quickPair({
    ids: [DIET_GROUP],
    scope: DIET_GROUP,
    locale,
    name: (value) => t('quick.group', { name: t('diet.title'), value }),
    setScenario,
  });
  const diet = group(
    { id: DIET_GROUP, title: t('diet.title'), worth: 'diet', quick: quick.el },
    h('p', { class: 'hint' }, t('diet.description')),
    main.el,
    basis.el,
    replacement.el,
    where.el,
  );
  const advanced = h(
    'details',
    { class: 'fold', 'data-fold': 'advanced' },
    h('summary', {}, t('controls.advanced')),
    h('p', { class: 'hint' }, t('controls.groupsHint')),
    ...groups.map((g) =>
      h(
        'div',
        { class: 'lever' },
        g.control.el,
        h('div', { class: 'lever-foot' }, worthPill(`group:${g.group}`)),
      ),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'link-button',
        onclick: () => setScenario((s) => ({ ...s, groupShifts: {} })),
      },
      t('controls.groupsReset'),
    ),
  );
  diet.el.querySelector('.group-body')?.append(advanced);
  const set = (s: Scenario) => {
    const meta = dietMeta(s);
    diet.setMeta(
      t(meta.key, { share: formatPercent(locale, meta.params.share), year: meta.params.year }),
    );
    quick.set(s);
    main.set(Math.round(s.shift * 100));
    basis.set(s.basis);
    replacement.set(s.replacement);
    where.set(s.where);
    groups.forEach(({ group, control }) =>
      control.set(Math.round((s.groupShifts[group] ?? s.shift) * 100)),
    );
  };
  set(scenario);
  return { el: diet.el, set };
};

/**
 * The year every lever, the diet included, is fully in place: they ramp in linearly from the
 * current year to it. At the top of the panel, as it applies to all of them.
 */
export const timingControl = (ctx: PanelContext): Control<Scenario> => {
  const { t, currentYear, scenario, setScenario } = ctx;
  const ramp = slider({
    id: 'rampEnd',
    label: t('controls.rampEnd'),
    min: Math.min(currentYear + 1, 2050),
    max: 2050,
    step: 1,
    value: scenario.rampEnd,
    format: String,
    marks: [2030, 2035, 2040, 2050]
      .filter((y) => y > currentYear)
      .map((y) => ({ value: y, label: String(y) })),
    onInput: (rampEnd) => setScenario((s) => ({ ...s, rampEnd })),
  });
  return {
    el: h(
      'div',
      { class: 'timing', 'data-control': 'timing' },
      ramp.el,
      h('p', { class: 'hint' }, t('controls.rampHint')),
    ),
    set: (s) => ramp.set(s.rampEnd),
  };
};
