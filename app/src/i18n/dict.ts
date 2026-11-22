export type Tree = { [key: string]: string | Tree };
export type Params = Record<string, string | number>;

/** Nested dictionary to dotted keys: { a: { b: 'x' } } → { 'a.b': 'x' }. */
export const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );

export const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

export const interpolate = (text: string, params: Params = {}): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));

export const lookup = (dicts: Record<string, string>[], key: string, params: Params = {}): string =>
  interpolate(dicts.map((d) => d[key]).find((v) => v !== undefined) ?? key, params);
