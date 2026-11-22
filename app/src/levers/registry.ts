// The lever modules, and what the core reads from them. The only file a new module shares.

import type { Cause, CountedCause, LeverCause, ModelData } from '../data/types';
import type { Levers } from '../model/api';
import { deforestation } from './deforestation';
import { energy } from './energy';
import { industry } from './industry';
import { permafrost } from './permafrost';
import { population } from './population';
import { practices } from './practices';
import { regrowth } from './regrowth';
import { removals } from './removals';
import type { DataFileDef, LeverDef, LeverModule, OptionDef } from './types';
import { waste } from './waste';

/**
 * Every module. The by-family breakdown does not depend on their order (Shapley values, see
 * `model/attribution.ts`); the families are listed and the options follow the core options in
 * this order, the world population first, beside the rest of the world's emissions.
 */
export const MODULES: readonly LeverModule[] = [
  population,
  waste,
  practices,
  deforestation,
  regrowth,
  removals,
  energy,
  industry,
  permafrost,
];

/**
 * The order of the levers in the URL and of the modules' Methodology pages; the panel orders its
 * groups by cause and by what each is worth (`app/panelOrder.ts`).
 */
const PANEL_ORDER = ['practices', 'waste', 'deforestation', 'removals', 'energy'];

/** The order of the modules' figures in the summary strip. */
const SUMMARY_ORDER = ['regrowth', 'removals', 'deforestation'];

/** Modules listed in `order` first, in that order, then the others in registry order. */
const ordered = (order: readonly string[]): LeverModule[] => [
  ...order.flatMap((id) => MODULES.filter((m) => m.id === id)),
  ...MODULES.filter((m) => !order.includes(m.id)),
];

/** Modules with levers, in the order of the panel. */
export const PANEL_MODULES: readonly LeverModule[] = ordered(PANEL_ORDER).filter(
  (m) => m.levers.length > 0,
);

/** Modules with a summary figure, in the order of the strip. */
export const SUMMARY_MODULES: readonly LeverModule[] = ordered(SUMMARY_ORDER).filter(
  (m) => m.ui.stat !== undefined,
);

export type LeverId = string;

/** Every lever, in the order of the panel, with the module it belongs to. */
export const LEVERS: readonly (LeverDef & { module: LeverModule })[] = PANEL_MODULES.flatMap((m) =>
  m.levers.map((l) => ({ ...l, module: m })),
);
export const LEVER_IDS: readonly LeverId[] = LEVERS.map((l) => l.id);

/** The modules' options, in registry order. */
export const MODULE_OPTIONS: readonly OptionDef[] = MODULES.flatMap((m) => m.options);

/** What the warming avoided is shared out between: the diet shift and each module's family. */
export const FAMILIES: readonly string[] = [
  'diet',
  ...MODULES.flatMap((m) => (m.family ? [m.family] : [])),
];
export type Family = string;

/** The families of farming, whose change is farm emissions, clearing and farmland uptake. */
export const FARM_FAMILIES: readonly string[] = FAMILIES.filter(
  (f) => !MODULES.some((m) => m.family === f && m.farm === false),
);

/** The cause the diet shift mainly acts on: farming (its clearing counts in land use). */
export const DIET_CAUSE: LeverCause = 'agriculture';

/** The causes a lever acts on, in the order of the data. */
export const LEVER_CAUSES: readonly LeverCause[] = ['fossilIndustry', 'agriculture', 'landUse'];

/**
 * The causes the levers' effects are counted in, in the order of the data: a lever's own cause,
 * and air pollution, which the energy levers' fuel cuts reduce.
 */
export const COUNTED_CAUSES: readonly CountedCause[] = [...LEVER_CAUSES, 'airPollution'];

/** The cause a family mainly acts on, its group's heading in the panel. */
export const causeOfFamily = (family: string): Cause =>
  family === 'diet' ? DIET_CAUSE : (MODULES.find((m) => m.family === family)?.cause ?? 'other');

/** The i18n key of a family's name in the breakdown. */
export const familyLabel = (family: string): string => {
  const m = MODULES.find((x) => x.family === family);
  return m ? `levers.${m.id}.family` : `summary.byFamily.${family}`;
};

/**
 * The data files the modules read, each with what stands for it when it is missing and the
 * levers of its module.
 */
export const LEVER_FILES: readonly (DataFileDef & { levers: readonly LeverId[] })[] =
  MODULES.flatMap((m) => m.files.map((f) => ({ ...f, levers: m.levers.map((l) => l.id) })));

/** A lever's adoption, clamped to 0..1, 0 when unset or not a number. */
export const adoptionOf = (levers: Levers, id: LeverId): number => {
  const a = levers[id];
  return a === undefined || !Number.isFinite(a) ? 0 : Math.min(1, Math.max(0, a));
};

const moduleOf = new Map(LEVERS.map((l) => [l.id, l.module]));

/** Whether the data has what a lever needs to act. */
export const leverAvailable = (data: ModelData, id: LeverId): boolean => {
  const m = moduleOf.get(id);
  return m !== undefined && (m.available?.(data, id) ?? true);
};

/** The Methodology pages the modules add, in the order of the panel. */
export const MODULE_PAGES: readonly { page: string; module: string }[] = ordered(
  PANEL_ORDER,
).flatMap((m) => ('page' in m.methodology ? [{ page: m.methodology.page, module: m.id }] : []));
