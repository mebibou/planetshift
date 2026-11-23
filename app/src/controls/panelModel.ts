import type { AnimalGroup } from '../data/types';
import { formatTemperature } from '../i18n/format';
import { adoptionOf } from '../levers/registry';
import type { LeverSpec } from '../levers/types';
import type { Levers, Options, Scenario } from '../model/api';
import { DEFAULT_OPTIONS, OPTIONS } from '../model/options';

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

/** How many of a module's levers are adopted, for its group's summary line. */
export const adoptedCount = (levers: Levers, module: LeverSpec): number =>
  module.levers.filter((l) => adoptionOf(levers, l.id) > 0).length;

export const optionValue = (options: Options, field: string): string =>
  (options as unknown as Record<string, string>)[field] ?? '';

/** How many options differ from their default, for the group's summary line. */
export const changedOptions = (options: Options): number =>
  OPTIONS.filter((o) => optionValue(options, o.field) !== optionValue(DEFAULT_OPTIONS, o.field))
    .length;

/** −0.012 °C, or < 0.001 °C either way for a change too small to show. */
export const worthText = (locale: string, change: number): string =>
  Math.abs(change) < 0.0005
    ? `< ${formatTemperature(locale, 0.001, 3)}`
    : formatTemperature(locale, change, Math.abs(change) < 0.01 ? 3 : 2, true);
