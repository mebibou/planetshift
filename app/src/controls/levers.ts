import { h } from '../app/dom';
import type { T } from '../i18n/i18n';
import { formatPercent } from '../i18n/format';
import { adoptionOf, PANEL_MODULES, type LeverId } from '../levers/registry';
import type { LeverModule } from '../levers/types';
import type { Levers, Scenario } from '../model/api';
import { withFamily, withLever } from './adoption';
import { group, worthPill } from './group';
import { info } from './info';
import { quickPair } from './quick';
import { slider } from './slider';

/** How many of a module's levers are adopted, for its group's summary line. */
export const adoptedCount = (levers: Levers, module: LeverModule): number =>
  module.levers.filter((l) => adoptionOf(levers, l.id) > 0).length;

export interface LeversContext {
  t: T;
  locale: string;
  scenario: Scenario;
  available: (id: LeverId) => boolean;
  setScenario: (change: (s: Scenario) => Scenario) => void;
}

/**
 * One group per lever module, closed at first, a 0–100% adoption slider per lever; the panel
 * places them under their causes.
 */
export const leverGroups = (
  ctx: LeversContext,
): { groups: { module: LeverModule; el: HTMLElement }[]; set: (s: Scenario) => void } => {
  const { t, locale, scenario, available, setScenario } = ctx;
  const pct = (v: number) => formatPercent(locale, v / 100);
  const levers = PANEL_MODULES.flatMap((module) =>
    module.levers.map(({ id, min, max, step, ui }) => {
      const control = slider({
        id: `lever-${id}`,
        label: t(ui.label),
        min: min * 100,
        max: max * 100,
        step: step * 100,
        value: Math.round(adoptionOf(scenario.levers, id) * 100),
        format: pct,
        marks: ui.marks.map((v) => ({ value: v * 100, label: pct(v * 100) })),
        info: info(t('controls.info', { name: t(ui.label) }), t(ui.hint)),
        onInput: (v) => setScenario((s) => withLever(s, id, v / 100)),
      });
      const on = available(id);
      if (!on) control.el.querySelector('input')?.setAttribute('disabled', '');
      return {
        id,
        module,
        control,
        el: h(
          'div',
          { class: 'lever', 'data-lever': id },
          control.el,
          h(
            'div',
            { class: 'lever-foot' },
            on ? worthPill(`lever:${id}`) : h('p', { class: 'hint' }, t('levers.noData')),
          ),
        ),
      };
    }),
  );
  const groups = PANEL_MODULES.map((module) => {
    const button = (label: string, adoption: number) =>
      h(
        'button',
        {
          type: 'button',
          class: 'link-button',
          'data-action': adoption > 0 ? 'max' : 'reset',
          onclick: () => setScenario((s) => withFamily(s, module, adoption)),
        },
        label,
      );
    const title = t(`levers.${module.id}.title`);
    const quick = quickPair({
      ids: [module.id],
      scope: module.id,
      locale,
      name: (value) => t('quick.group', { name: title, value }),
      setScenario,
    });
    return {
      module,
      quick,
      group: group(
        {
          id: `levers-${module.id}`,
          title,
          worth: `family:${module.id}`,
          quick: quick.el,
        },
        h('p', { class: 'hint' }, t(`levers.${module.id}.description`)),
        ...levers.filter((l) => l.module === module).map((l) => l.el),
        h(
          'div',
          { class: 'lever-actions' },
          button(t('levers.maxAll'), 1),
          button(t('levers.reset'), 0),
        ),
      ),
    };
  });
  const set = (s: Scenario) => {
    levers.forEach(({ id, control }) => control.set(Math.round(adoptionOf(s.levers, id) * 100)));
    groups.forEach(({ module, group: g, quick }) => {
      quick.set(s);
      const count = adoptedCount(s.levers, module);
      const total = module.levers.length;
      g.setMeta(
        total === 1
          ? t(count > 0 ? 'levers.adoptedOne' : 'levers.notAdopted')
          : count > 0
            ? t('levers.adoptedOf', { count, total })
            : t('levers.noneAdopted', { total }),
      );
    });
  };
  set(scenario);
  return { groups: groups.map((g) => ({ module: g.module, el: g.group.el })), set };
};
