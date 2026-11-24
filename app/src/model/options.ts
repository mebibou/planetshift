import { MODULE_OPTIONS } from '../levers/registry';
import type { OptionDef } from '../levers/types';
import type { Options } from './api';

const core = (field: keyof Options, key: string, values: readonly string[]): OptionDef => ({
  field,
  key,
  values,
  texts: `options.${field}`,
});

/** The core's method options, the default first. */
const CORE_OPTIONS: readonly OptionDef[] = [
  core('scope', 'scope', ['cradleToFarmGate', 'farmGate']),
  core('feed', 'feed', ['species', 'gleam']),
  core('baseline', 'base', ['population', 'ssp2']),
  core('location', 'loc', ['fixedTrade', 'domestic']),
  core('temperature', 'temp', ['hadcrut5', 'berkeley']),
  core('climate', 'clim', ['fair', 'ar6']),
  core('ssp', 'ssp', ['ssp245', 'ssp126', 'ssp370']),
];

/** Every option, the core's then the modules', in the order of the Options group and the URL. */
export const OPTIONS: readonly OptionDef[] = [...CORE_OPTIONS, ...MODULE_OPTIONS];

export const DEFAULT_OPTIONS: Options = Object.fromEntries(
  OPTIONS.map((o) => [o.field, o.values[0]]),
) as unknown as Options;
