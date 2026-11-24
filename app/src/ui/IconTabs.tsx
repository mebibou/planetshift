import type { KeyboardEvent, ReactNode } from 'react';
import { tabKeys } from '../app/tabs';
import { TOOL_BUTTON } from './classes';
import { Icon, type IconName } from './Icon';

export interface IconTab<V extends string> {
  value: V;
  icon: IconName;
  label: ReactNode;
}

/**
 * Tabs drawn as a switch of icon buttons, for two views of one card. Each tab controls the panel
 * `<prefix>-panel-<value>`; the arrow keys, Home and End move between them.
 */
export const IconTabs = <V extends string>(p: {
  label: string;
  prefix: string;
  tabs: readonly IconTab<V>[];
  value: V;
  onChange: (v: V) => void;
  /** Tabs sharing the width between them. */
  wide?: boolean;
}) => {
  const values = p.tabs.map((tab) => tab.value);
  return (
    <div
      className={`view-tabs flex gap-1 rounded-lg bg-surface-2 p-[3px] ${p.wide ? 'w-full' : ''}`}
      role="tablist"
      aria-label={p.label}
    >
      {p.tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          id={`${p.prefix}-tab-${tab.value}`}
          className={`view-tab ${TOOL_BUTTON} border-0 bg-transparent text-muted not-aria-selected:hover:bg-accent-soft aria-selected:bg-surface aria-selected:font-bold aria-selected:text-ink aria-selected:ring-1 aria-selected:ring-rule ${p.wide ? 'flex-1 justify-center' : ''}`}
          data-view={tab.value}
          aria-controls={`${p.prefix}-panel-${tab.value}`}
          aria-selected={p.value === tab.value}
          tabIndex={p.value === tab.value ? 0 : -1}
          onClick={() => p.onChange(tab.value)}
          onKeyDown={(e: KeyboardEvent) =>
            tabKeys(
              values,
              tab.value,
              p.onChange,
              (target) => `${p.prefix}-tab-${target}`,
            )(e.nativeEvent)
          }
        >
          <Icon name={tab.icon} />
          {tab.label}
        </button>
      ))}
    </div>
  );
};
