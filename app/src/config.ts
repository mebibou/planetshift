// Baked in when the site is built; never an option or in the URL (docs/app.md, "Forking").

import type { Departure, Departures } from './configSchema';
import type { ModelData } from './data/types';

export type { Departure, Departures };

/** The departures that are a lever module of their own, present when on. */
export type ModuleDeparture = {
  [K in Departure]: Departures[K] extends 'on' | 'off' ? K : never;
}[Departure];

export const DEPARTURES: Departures = __PLANETSHIFT_DEPARTURES__;

/** The build's departures, unless the data carries others, as tests do. */
export const departuresOf = (data: Pick<ModelData, 'departures'>): Departures =>
  data.departures ?? DEPARTURES;

export const departs = (data: Pick<ModelData, 'departures'>, d: ModuleDeparture): boolean =>
  departuresOf(data)[d] === 'on';
