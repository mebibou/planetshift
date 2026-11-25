// How planetshift.config.json is read: pure, so that vite.config.ts can check it when the site is
// built. The values the build was made with are in config.ts.

/** Each departure from FaIR and its values; the schema gives the default and the plain one. */
export interface Departures {
  noxMethane: 'chemistry' | 'fair' | 'hoor';
  coMethane: 'split' | 'fair';
  aviationNonCo2: 'lee2021' | 'fair';
  permafrost: 'on' | 'off';
  shippingSulphur2020: 'on' | 'off';
}
export type Departure = keyof Departures;

export interface SwitchSchema {
  enum: readonly string[];
  default: string;
  plainFair: string;
  description: string;
}

export interface ConfigSchema {
  properties: Record<string, unknown> & {
    departures: { properties: Record<string, SwitchSchema> };
  };
}

const switchesOf = (schema: ConfigSchema): Record<string, SwitchSchema> =>
  schema.properties.departures.properties;

/**
 * Every switch's value: the config's, or its default when left out. Throws on a key the schema
 * does not know or a value outside a switch's values, so a fork's build fails rather than guess.
 */
/** Throws with every problem found, so a fork's build fails rather than guess. */
const failOn = (errors: string[]): void => {
  if (errors.length > 0) {
    throw new Error(`planetshift.config.json: ${errors.join('; ')}`);
  }
};

/** The config's departures, checked to be an object. */
const departuresIn = (top: Record<string, unknown>): Record<string, unknown> => {
  const given = top.departures ?? {};
  failOn(
    typeof given !== 'object' || given === null || Array.isArray(given)
      ? ['departures must be an object']
      : [],
  );
  return given as Record<string, unknown>;
};

/** What is wrong with one departure's value: an unknown switch, or a value it does not take. */
const departureErrors = (s: SwitchSchema | undefined, k: string, v: unknown): string[] =>
  !s
    ? [`unknown departure ${k}`]
    : !s.enum.includes(v as string)
      ? [`${k} is ${JSON.stringify(v)}, not one of ${s.enum.join(', ')}`]
      : [];

export const resolveDepartures = (schema: ConfigSchema, config: unknown): Departures => {
  const known = switchesOf(schema);
  const top = (config ?? {}) as Record<string, unknown>;
  const unknown = Object.keys(top).filter((k) => !(k in schema.properties));
  failOn(unknown.length > 0 ? [`unknown keys ${unknown}`] : []);
  const given = departuresIn(top);
  failOn(Object.entries(given).flatMap(([k, v]) => departureErrors(known[k], k, v)));
  const values = given as Record<string, string | undefined>;
  return Object.fromEntries(
    Object.entries(known).map(([k, s]) => [k, values[k] ?? s.default]),
  ) as unknown as Departures;
};

/** Every switch at the value that keeps to FaIR. */
export const plainFair = (schema: ConfigSchema): Departures =>
  Object.fromEntries(
    Object.entries(switchesOf(schema)).map(([k, s]) => [k, s.plainFair]),
  ) as unknown as Departures;
