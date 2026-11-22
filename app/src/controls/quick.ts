import { h } from '../app/dom';
import { formatPercent } from '../i18n/format';
import type { Scenario } from '../model/api';
import { groupsLevel, withGroupsAt } from './adoption';

export interface QuickPair {
  el: HTMLElement;
  set: (s: Scenario) => void;
}

/**
 * A "0%" / "100%" pair setting a set of groups at once, in one change of the scenario; the one
 * matching where they stand is pressed, neither when they are in between. `name` gives each
 * button's accessible name from its value, such as "Set Farm practices to 0%".
 */
export const quickPair = (spec: {
  ids: readonly string[];
  scope: string;
  locale: string;
  name: (value: string) => string;
  setScenario: (change: (s: Scenario) => Scenario) => void;
}): QuickPair => {
  const button = (adoption: 0 | 1) => {
    const value = formatPercent(spec.locale, adoption);
    return h(
      'button',
      {
        type: 'button',
        class: 'quick-button',
        'data-quick': adoption === 1 ? 'full' : 'zero',
        'aria-label': spec.name(value),
        'aria-pressed': 'false',
        title: spec.name(value),
        onclick: () => spec.setScenario((s) => withGroupsAt(s, spec.ids, adoption)),
      },
      value,
    );
  };
  const buttons = [button(0), button(1)];
  return {
    el: h('span', { class: 'quick', 'data-quick-scope': spec.scope }, ...buttons),
    set: (s) => {
      const level = groupsLevel(s, spec.ids);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.quick === level)));
    },
  };
};
