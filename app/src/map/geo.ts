import type { Feature, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { feature } from 'topojson-client';

export type CountryFeature = Feature<Geometry, { iso3?: string; name?: string }>;

/** The countries of the first object in the topology, whatever it is called. */
export const countryFeatures = (world: Topology): CountryFeature[] => {
  const object = Object.values(world.objects)[0] as GeometryCollection | undefined;
  if (!object) return [];
  const collection = feature(world, object) as unknown as
    { type: 'FeatureCollection'; features: CountryFeature[] } | CountryFeature;
  return 'features' in collection ? collection.features : [collection];
};

export const iso3Of = (f: CountryFeature): string | null => {
  const v = f.properties?.iso3;
  return typeof v === 'string' && /^[A-Z]{3}$/.test(v) ? v : null;
};
