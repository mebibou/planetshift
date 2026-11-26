// The lever modules with their hooks, which only the model's run reads, so the interface's
// bundle holds none of their code.

import { deadfall } from './deadfall';
import { deforestation } from './deforestation';
import { energy } from './energy';
import { fossilMethane } from './fossilMethane';
import { hfc } from './hfc';
import { industry } from './industry';
import { permafrost } from './permafrost';
import { population } from './population';
import { practices } from './practices';
import { regrowth } from './regrowth';
import { removals } from './removals';
import { shippingSulphur } from './shippingSulphur';
import { waste } from './waste';
import { wasteMethane } from './wasteMethane';
import { kept, MODULES as SPECS } from './registry';
import type { LeverModule } from './types';

const ALL: readonly LeverModule[] = [
  population,
  waste,
  wasteMethane,
  practices,
  deforestation,
  regrowth,
  deadfall,
  removals,
  energy,
  industry,
  fossilMethane,
  hfc,
  shippingSulphur,
  permafrost,
].filter(kept);

/** Every module the build keeps, in the registry's order, with its hooks. */
export const MODULES: readonly LeverModule[] = SPECS.flatMap((spec) =>
  ALL.filter((m) => m.id === spec.id),
);
