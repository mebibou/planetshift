import type { Feature, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { feature } from 'topojson-client';

export type CountryFeature = Feature<Geometry, { iso3?: string; name?: string; nameFr?: string }>;

type Collection = { type: 'FeatureCollection'; features: CountryFeature[] } | CountryFeature;

const featuresOf = (collection: Collection): CountryFeature[] =>
  'features' in collection ? collection.features : [collection];

/** The countries of the first object in the topology, whatever it is called. */
export const countryFeatures = (world: Topology): CountryFeature[] => {
  const object = Object.values(world.objects)[0] as GeometryCollection | undefined;
  return object ? featuresOf(feature(world, object) as unknown as Collection) : [];
};

export const iso3Of = (f: CountryFeature): string | null => {
  const v = f.properties?.iso3;
  return typeof v === 'string' && /^[A-Z]{3}$/.test(v) ? v : null;
};

/** Each shape's name in a language, from the map's own data: for the places without a country record. */
const nameIn = (f: CountryFeature, lang: 'en' | 'fr'): string | undefined =>
  (lang === 'fr' ? f.properties?.nameFr : undefined) ?? f.properties?.name;

export const shapeNames = (world: Topology, lang: 'en' | 'fr'): [string, string][] =>
  countryFeatures(world).flatMap((f) => {
    const iso3 = iso3Of(f);
    const name = nameIn(f, lang);
    return iso3 && name ? [[iso3, name] as [string, string]] : [];
  });
