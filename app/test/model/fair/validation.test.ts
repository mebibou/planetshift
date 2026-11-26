// The TypeScript port against Python FaIR 2.2.5, member by member, on the scenarios the
// pipeline's `fair_ts_export` writes (run it first; skipped without them).

import { describe, expect, it } from 'vitest';
import { loadModel } from '../../../src/model/fair/calibration';
import { anomaly, bandAt, runEnsemble, type Band } from '../../../src/model/fair/ensemble';
import { prepareScenario } from '../../../src/model/fair/scenario';
import {
  exported,
  readCalibration,
  readNoise,
  readPython,
  readScenario,
  SCENARIOS,
  STEPS,
} from './exported';

const maxAbsDifference = (a: readonly Float64Array[], b: readonly Float64Array[]): number =>
  Math.max(
    ...a.map((row, k) =>
      row.reduce((max, v, t) => Math.max(max, Math.abs(v - (b[k]?.[t] as number))), 0),
    ),
  );

const show = (b: Band): string =>
  `${b.median.toFixed(3)} (${b.p05.toFixed(3)}–${b.p95.toFixed(3)})`;

describe.skipIf(!exported)('FaIR port against Python FaIR', () => {
  const model = exported ? loadModel(readCalibration()) : null;
  const noise = exported ? readNoise() : [];

  it.each(SCENARIOS)('matches every member on %s within 1e-3 °C, 1750–2100', (name) => {
    const m = model as NonNullable<typeof model>;
    const prepared = prepareScenario(m, readScenario(name), STEPS);
    const ts = runEnsemble(m, prepared, (k) => noise[k] as Float64Array);
    const python = readPython(name);
    const quiet = runEnsemble(m, prepared).map(anomaly);
    const error = maxAbsDifference(ts, python);
    const [py, port] = [python, ts].map((runs) => runs.map(anomaly));
    const line = [2050, 2100].map(
      (y) =>
        `${y}: Python ${show(bandAt(py as Float64Array[], y))}, TS ${show(bandAt(port as Float64Array[], y))}, TS without noise ${show(bandAt(quiet, y))}`,
    );
    console.log(`${name}: max |ΔT| ${error.toExponential(2)} °C; ${line.join('; ')}`);
    expect(error).toBeLessThan(1e-3);
  });
});
