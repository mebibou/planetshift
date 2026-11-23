import type { Intensities, Scope, Tier } from '../data/types';

export const TIERS: Tier[] = [1, 2, 3, 4, 5, 6];

export interface TierSource {
  tier: Tier;
  source: string;
}

/** The intensity with the worst tier among a country's items, under the given scope. */
export const worstSource = (
  intensities: Intensities,
  iso3: string,
  scope: Scope,
): TierSource | null =>
  Object.values(intensities.byCountry[iso3] ?? {})
    .map((byScope) => byScope[scope])
    .filter((i): i is NonNullable<typeof i> => i !== undefined)
    .reduce<TierSource | null>(
      (worst, i) =>
        worst === null || i.tier > worst.tier ? { tier: i.tier, source: i.source } : worst,
      null,
    );

const KNOWN: [RegExp, string][] = [
  [/(^|\.)hestia\.earth$/, 'HESTIA'],
  [/(^|\.)fao\.org$/, 'FAOSTAT'],
  [/(^|\.)science\.org$/, 'Poore & Nemecek (2018)'],
];

/** The source as an address a browser can open, or null. */
const webUrl = (source: string): URL | null => {
  const url = URL.canParse(source) ? new URL(source) : null;
  return url && (url.protocol === 'https:' || url.protocol === 'http:') ? url : null;
};

/** A known publisher's name for the address, else its host without www. */
const shortName = (url: URL): string => {
  const host = url.hostname.replace(/^www\./, '');
  return KNOWN.find(([re]) => re.test(host))?.[1] ?? host;
};

/** A short name for a source URL, and the URL when it is one a browser can open. */
export const sourceLink = (source: string): { label: string; url: string | null } => {
  const url = webUrl(source);
  return url ? { label: shortName(url), url: url.href } : { label: source, url: null };
};

/** A source as the table shows it: a short link when it holds an address, its text otherwise. */
export const sourceInText = (source: string): { label: string; url: string | null } => {
  const url = source.match(/https?:\/\/\S+/)?.[0];
  return url ? sourceLink(url) : { label: source, url: null };
};
