// What a lever module is: its levers and options, the data files it reads, the hooks the core
// run calls at fixed points, and how the interface draws and names it. docs/app.md explains
// how to add one.

import type { CountedCause, Gas, GasVector, LeverCause, ModelData } from '../data/types';
import type { CountryResult, Options, Scenario, ScenarioResult } from '../model/api';
import type { ModuleDeparture } from '../config';
import type { Band } from '../model/climate';
import type { Farmland } from '../model/land';
import type { Prepared, PreparedCountry } from '../model/prepare';
import type { ItemVector } from '../model/util';

/** A lever: a share adopted, 0..1, reached when the shift is complete. */
export interface LeverDef {
  id: string;
  /** Its key in the URL, where its adoption is written in percent. */
  key: string;
  default: number;
  min: number;
  max: number;
  step: number;
  unit: 'share';
  /** Drawn as a slider of 0–100% with these i18n keys. */
  ui: { control: 'slider'; label: string; hint: string; marks: readonly number[] };
}

/** A method option: one of a few values, the default first. */
export interface OptionDef {
  /** Its field in `Options`. */
  field: string;
  /** Its key in the URL. */
  key: string;
  values: readonly string[];
  /** The i18n prefix of its texts: `<prefix>.label`, `.hint` and one per value. */
  texts: string;
}

/** A data file a module reads, and what stands for it when the build has none. */
export interface DataFileDef {
  name: string;
  empty: unknown;
  /** Loaded only once one of the module's levers is above 0; `empty` stands for it until then. */
  deferred?: boolean;
}

/** What every hook is given: the run's inputs and the adoption of any lever. */
export interface RunContext {
  prepared: Prepared;
  scenario: Scenario;
  options: Options;
  currentYear: number;
  /** A lever's adoption, clamped to 0..1, 0 when unset. */
  adoption: (id: string) => number;
}

/**
 * Changes to the supply chain: what people use once the diet has shifted (`demand`), how much
 * supply each tonne of use needs (`multipliers`), and the losses no longer incurred.
 */
export interface SupplyChain {
  used?: (pc: PreparedCountry, dietFood: ItemVector) => ItemVector;
  multipliers?: (pc: PreparedCountry) => ItemVector;
  avoidedLosses?: (pc: PreparedCountry) => ItemVector;
}

/** One step of the change in production: the diet's, then each module's that changes supply. */
export interface Stage {
  family: string;
  /** The change in emitting production up to this step, tonnes by item. */
  change: ItemVector;
}

export interface CountryContext {
  pc: PreparedCountry;
  /** The steps in order; the last is the change in production with every module. */
  stages: readonly Stage[];
  land: Farmland;
  landChange: Farmland;
}

/** What a module adds to a country: CO₂ a year by family, and its own fields of the result. */
export interface CountryPart {
  co2?: Readonly<Record<string, number>>;
  /** CO₂ a year that a lever changes on the production the steps changed, by family. */
  jointCo2?: Readonly<Record<string, number>>;
  result?: Readonly<Record<string, number>>;
}

export interface WorldContext {
  countries: readonly CountryResult[];
  /** Current year..END_YEAR. */
  years: readonly number[];
  /** Temperature years, 1850..END_YEAR. */
  tYears: readonly number[];
  /** Share of the full shift and adoption reached in a year. */
  shareAt: (year: number) => number;
  /** Index in `years` of the year the shift is complete. */
  completeIndex: number;
}

/**
 * What a module adds to the world: its family's emissions each year by band (when they are not
 * farm emissions or clearing), warming by band from forcing that is not an emission, and its
 * fields of the summary.
 */
export interface WorldPart {
  extraEmissions?: Record<Band, GasVector[]>;
  extraWarming?: Record<Band, number[]> | null;
  /**
   * Warming by band it causes through a cause other than its own, counted there (the energy
   * levers' air pollution), °C on the temperature years.
   */
  warmingByCause?: Partial<Record<CountedCause, Record<Band, number[]>>>;
  summary?: Readonly<Record<string, unknown>>;
  /** Its own fields of the result, beside the summary (a series for a chart). */
  result?: Readonly<Record<string, unknown>>;
}

export interface PopulationContext {
  prepared: Prepared;
  options: Options;
}

export interface BaselineContext {
  prepared: Prepared;
  options: Options;
  currentYear: number;
  band: Band;
  tYears: readonly number[];
  /** The baseline temperature before this module, °C by year of `tYears`. */
  temperature: readonly number[];
}

/** Warming the module adds to the baseline (null for none), and what it keeps for `feedback`. */
export interface BaselinePart {
  warming: number[] | null;
  memo?: unknown;
}

export interface FeedbackContext extends BaselineContext {
  memo: unknown;
  /** The change in temperature from every family, °C by year. */
  delta: readonly number[];
}

/**
 * The fixed points where the core run calls a module, all optional. Each receives the run's
 * context and returns null when the module has nothing to do in this run.
 */
export interface Hooks {
  /**
   * World population by year, base year..END_YEAR, in place of the countries' own (another
   * projection); the population baseline scales farm emissions by it. The first module in
   * registry order that returns one is used.
   */
  population?: (ctx: PopulationContext) => Readonly<Record<number, number>> | null;
  /** What people use once the diet has shifted (less waste): a production step. */
  demand?: (ctx: RunContext) => SupplyChain['used'] | null;
  /** Supply per tonne of use and losses avoided: a production step with `demand`. */
  supplyChain?: (ctx: RunContext) => Omit<SupplyChain, 'used'> | null;
  /** The share of each item's intensity of each gas removed, on the production with every step. */
  intensity?: (
    ctx: RunContext,
  ) => ((pc: PreparedCountry, band: Band) => Record<Gas, ItemVector>) | null;
  /** A country's CO₂ by family (a constant stream, like clearing) and its fields of the result. */
  country?: (ctx: RunContext) => ((c: CountryContext) => CountryPart) | null;
  /** The module's emissions, warming and summary over the years. */
  world?: (ctx: RunContext, w: WorldContext) => WorldPart;
  /** Warming the module adds to the baseline, in registry order. */
  baseline?: (ctx: BaselineContext) => BaselinePart;
  /** Warming the scenario's change in temperature causes in turn, shared out between families. */
  feedback?: (ctx: FeedbackContext) => number[] | null;
}

/** A summary figure the module shows: label and detail keys with their values, or none. */
export interface SummaryStat {
  label: string;
  value: string;
  detail: string;
  className: string;
}

export interface Format {
  t: (key: string, params?: Record<string, string | number>) => string;
  mass: (kg: number) => string;
  percent: (share: number, digits?: number) => string;
}

export interface LeverModule {
  id: string;
  /** The family its effect is counted in, in the by-family breakdown; none for a feedback. */
  family?: string;
  /** Whether its family is farming (farm emissions, clearing, farmland uptake) or not. */
  farm?: boolean;
  /**
   * The cause of warming its family mainly acts on: the heading its group goes under in the
   * panel, and the cause its own emissions count in (country CO₂, world emissions and warming);
   * farm emissions always count in farming. None for a module without a family.
   */
  cause?: LeverCause;
  /** Off in planetshift.config.json, the build leaves the module out; its hooks check the data's. */
  departure?: ModuleDeparture;
  levers: readonly LeverDef[];
  options: readonly OptionDef[];
  files: readonly DataFileDef[];
  /** Whether the data has what a lever needs to act. */
  available?: (data: ModelData, leverId: string) => boolean;
  hooks: Hooks;
  ui: {
    /** Its levers' fold in the Levers section; options always render in the Options group. */
    section?: 'levers';
    /** Its figure in the summary strip, after the farmland freed. */
    stat?: (
      result: ScenarioResult,
      options: Options,
      completeYear: number,
      f: Format,
    ) => SummaryStat | null;
  };
  /** The Methodology page that explains it: its own, or the core page that covers it. */
  methodology: { page: string } | { coveredBy: string };
}
