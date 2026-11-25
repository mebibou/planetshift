import { describe, expect, it } from 'vitest';
import type { Topology } from 'topojson-specification';
import { shapeNames } from '../../src/map/geo';

const world = {
  type: 'Topology',
  arcs: [],
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [
        { type: null, properties: { iso3: 'GRL', name: 'Greenland', nameFr: 'Groenland' } },
        { type: null, properties: { iso3: 'ESH', name: 'Western Sahara' } },
        { type: null, properties: { iso3: '-99', name: 'Nowhere' } },
      ],
    },
  },
} as unknown as Topology;

describe('the map shapes’ names', () => {
  it('names each shape in the language, in English where it has no French name', () => {
    expect(shapeNames(world, 'fr')).toEqual([
      ['GRL', 'Groenland'],
      ['ESH', 'Western Sahara'],
    ]);
    expect(shapeNames(world, 'en')[0]).toEqual(['GRL', 'Greenland']);
  });
});
