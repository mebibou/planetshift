import { decodeIntensities } from '../../src/data/load';
import type { Chain, IntensitiesFile, ModelData, Species } from '../../src/data/types';
import climate from '../../public/fixtures/climate.json';
import countries from '../../public/fixtures/countries.json';
import feed from '../../public/fixtures/feed.json';
import intensities from '../../public/fixtures/intensities.json';
import items from '../../public/fixtures/items.json';
import land from '../../public/fixtures/land.json';
import meta from '../../public/fixtures/meta.json';
import supply from '../../public/fixtures/supply.json';
import breakdown from '../../public/fixtures/breakdown.json';
import practices from '../../public/fixtures/practices.json';
import waste from '../../public/fixtures/waste.json';
import deforestation from '../../public/fixtures/deforestation.json';
import removals from '../../public/fixtures/removals.json';
import deadfall from '../../public/fixtures/deadfall.json';
import sectors from '../../public/fixtures/sectors.json';
import population from '../../public/fixtures/population.json';
import industry from '../../public/fixtures/industry.json';
import coemissions from '../../public/fixtures/coemissions.json';
import people from '../../public/fixtures/people.json';
import mammals from '../../public/fixtures/mammals.json';
import species from '../../public/fixtures/species.json';
import chain from '../../public/fixtures/chain.json';

/** The fixtures in public/fixtures, as the app loads them. */
export const loadFixtures = (): ModelData =>
  structuredClone({
    meta,
    countries,
    items,
    supply,
    intensities: decodeIntensities(intensities as IntensitiesFile),
    feed,
    climate,
    land,
    breakdown,
    practices,
    waste,
    deforestation,
    removals,
    deadfall,
    sectors,
    population,
    industry,
    coemissions,
    people,
    mammals,
    species: species as unknown as Species,
    chain: chain as unknown as Chain,
  }) as unknown as ModelData;

export const CURRENT_YEAR = 2026;
