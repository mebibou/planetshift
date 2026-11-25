import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodeIntensities, EMPTY_LEVER_DATA, LEVER_FILES } from '../../src/data/load';
import type { IntensitiesFile, ModelData } from '../../src/data/types';

const FOLDER = join(__dirname, '../../public/data');
const CORE = ['meta', 'countries', 'items', 'supply', 'intensities', 'feed', 'land', 'climate'];
const read = (f: string): unknown => JSON.parse(readFileSync(join(FOLDER, `${f}.json`), 'utf8'));

/** The real data in public/data when the pipeline has built it, else null. */
export const loadRealData = (): ModelData | null =>
  CORE.every((f) => existsSync(join(FOLDER, `${f}.json`)))
    ? ({
        ...Object.fromEntries(CORE.map((f) => [f, read(f)])),
        intensities: decodeIntensities(read('intensities') as IntensitiesFile),
        ...(existsSync(join(FOLDER, 'mammals.json')) ? { mammals: read('mammals') } : {}),
        ...(existsSync(join(FOLDER, 'species.json')) ? { species: read('species') } : {}),
        ...Object.fromEntries(
          LEVER_FILES.map((f) => [
            f,
            existsSync(join(FOLDER, `${f}.json`)) ? read(f) : EMPTY_LEVER_DATA[f],
          ]),
        ),
      } as unknown as ModelData)
    : null;
