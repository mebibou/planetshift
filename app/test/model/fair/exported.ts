import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CalibrationFile } from '../../../src/model/fair/calibration';
import type { ScenarioInput } from '../../../src/model/fair/scenario';

/** Where `uv run python -m planetshift_pipeline.fair_ts_export` writes by default. */
const FOLDER =
  process.env.FAIR_TS_DATA ?? join(__dirname, '../../../../pipeline/cache/fair/ts-prototype');

export const SCENARIOS = [
  'ssp126',
  'ssp245',
  'ssp370',
  'ssp245-agriculture',
  'ssp245-airPollution',
  'ssp245-stopped',
] as const;

/** 1750–2100, as the pipeline runs the scenarios. */
export const STEPS = 351;

export const exported = existsSync(join(FOLDER, 'calibration.json'));

const floats = (file: string): Float64Array => {
  const bytes = readFileSync(join(FOLDER, file));
  return new Float64Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
};

export type ExportedCalibration = CalibrationFile & {
  ebm: { eb_matrix_d: number[][][]; forcing_vector_d: number[][] };
};

export const readCalibration = (): ExportedCalibration =>
  JSON.parse(readFileSync(join(FOLDER, 'calibration.json'), 'utf8'));

export const readScenario = (name: string): ScenarioInput =>
  JSON.parse(readFileSync(join(FOLDER, `${name}.json`), 'utf8'));

/** Rows of `width` values, one per member. */
const rows = (values: Float64Array, width: number): Float64Array[] =>
  Array.from({ length: values.length / width }, (_, k) =>
    values.subarray(k * width, (k + 1) * width),
  );

/** Python FaIR's annual-mean temperature, one row per member. */
export const readPython = (name: string): Float64Array[] =>
  rows(floats(`${name}.temperature.f64`), STEPS);
