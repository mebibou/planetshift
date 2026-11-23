import { groupsLevel, withGroupsAt } from '../controls/adoption';
import { formatPercent } from '../i18n/format';
import type { Scenario } from '../model/api';

export interface QuickPairProps {
  ids: readonly string[];
  scope: string;
  locale: string;
  scenario: Scenario;
  /** Each button's accessible name from its value, such as "Set Farm practices to 0%". */
  name: (value: string) => string;
  setScenario: (change: (s: Scenario) => Scenario) => void;
}

const LEVELS = [
  { adoption: 0, quick: 'zero' },
  { adoption: 1, quick: 'full' },
] as const;

/**
 * A "0%" / "100%" pair setting a set of groups at once, in one change of the scenario; the one
 * matching where they stand is pressed, neither when they are in between.
 */
export const QuickPair = ({ ids, scope, locale, scenario, name, setScenario }: QuickPairProps) => {
  const level = groupsLevel(scenario, ids);
  return (
    <span className="quick" data-quick-scope={scope}>
      {LEVELS.map(({ adoption, quick }) => {
        const value = formatPercent(locale, adoption);
        return (
          <button
            key={quick}
            type="button"
            className="quick-button"
            data-quick={quick}
            aria-label={name(value)}
            aria-pressed={level === quick}
            title={name(value)}
            onClick={() => setScenario((s) => withGroupsAt(s, ids, adoption))}
          >
            {value}
          </button>
        );
      })}
    </span>
  );
};
