/** The page's markers, each with its year CE; their texts are at `deeptime.events.<id>`. */
export interface DeepTimeEvent {
  id: string;
  year: number;
  kind: 'extinction' | 'climate' | 'human';
}

const MA = (millions: number) => 1950 - millions * 1e6;

export const EVENTS: readonly DeepTimeEvent[] = [
  { id: 'ordovician', year: MA(445), kind: 'extinction' },
  { id: 'devonian', year: MA(372), kind: 'extinction' },
  { id: 'permian', year: MA(252), kind: 'extinction' },
  { id: 'triassic', year: MA(201), kind: 'extinction' },
  { id: 'cretaceous', year: MA(66), kind: 'extinction' },
  { id: 'petm', year: MA(55.9), kind: 'climate' },
  { id: 'lgm', year: 1950 - 21_000, kind: 'climate' },
  { id: 'agriculture', year: 1950 - 11_500, kind: 'human' },
  { id: 'industrial', year: 1850, kind: 'human' },
];

/** The Paris Agreement's levels, °C above 1850–1900. */
export const PARIS_LEVELS = [1.5, 2] as const;
