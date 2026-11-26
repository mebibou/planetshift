/**
 * deforestation.json: CO₂ from clearing forest for farming, attributed to the item whose
 * production the cleared land serves, tonnes of CO₂ per year (average over `years`), and the
 * forest area cleared, hectares a year. A build without the area has the CO₂ alone.
 * `drainedByCountry` is the CO₂ of drained organic soils under farming, tonnes a year by the item
 * it is shared to, `drainedN2oByCountry` their N₂O, and `rewettedCh4ByCountry` the CH₄ the same
 * land would emit once rewetted, tonnes a year: production changes the land drained, and the peat
 * rewetting lever rewets a share of it.
 */
export interface Deforestation {
  byCountry: Record<string, Record<string, number>>;
  areaByCountry?: Record<string, Record<string, number>>;
  drainedByCountry?: Record<string, Record<string, number>>;
  drainedN2oByCountry?: Record<string, Record<string, number>>;
  rewettedCh4ByCountry?: Record<string, Record<string, number>>;
  years: [number, number];
  source: string;
}

export const EMPTY_DEFORESTATION: Deforestation = {
  byCountry: {},
  areaByCountry: {},
  drainedByCountry: {},
  drainedN2oByCountry: {},
  rewettedCh4ByCountry: {},
  years: [0, 0],
  source: '',
};

declare module '../../data/types' {
  interface ModelData {
    deforestation: Deforestation;
  }
}

declare module '../../model/api' {
  interface CountryResult {
    /** CO₂ from clearing forest for the country's production, kg a year, and its change at full adoption. */
    deforestationCo2: number;
    deforestationChange: number;
    /** Forest cleared for the country's production, hectares a year, and its change. */
    deforestationHa: number;
    deforestationHaChange: number;
    /** CO₂ from drained organic soils under the country's production, kg a year, and its change. */
    drainedCo2: number;
    drainedChange: number;
    /** N₂O from the same soils, kg a year, and its change. */
    drainedN2o: number;
    drainedN2oChange: number;
    /** CH₄ of the country's drained soils rewetted by the levers or freed by the shift, kg a year. */
    rewettedCh4: number;
  }
  interface Summary {
    /** World deforestation CO₂ in the data's years, kg a year, and the part avoided at the full shift and adoption. */
    deforestationCo2: { before: number; avoided: number };
  }
}
