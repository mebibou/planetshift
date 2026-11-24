type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | EventListener;

const SVG_NS = 'http://www.w3.org/2000/svg';

const apply = <E extends Element>(
  el: E,
  attrs: Record<string, AttrValue>,
  children: Child[],
): E => {
  Object.entries(attrs).forEach(([key, value]) => {
    if (typeof value === 'function') {
      el.addEventListener(key.slice(2), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (value !== false && value !== null && value !== undefined) {
      el.setAttribute(key, String(value));
    }
  });
  el.append(
    ...children
      .filter((c): c is Node | string | number => c !== null && c !== undefined && c !== false)
      .map((c) => (typeof c === 'number' ? String(c) : c)),
  );
  return el;
};

/** Creates an HTML element: attributes starting with `on` are event listeners. */
export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] => apply(document.createElement(tag), attrs, children);

export const svg = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): SVGElementTagNameMap[K] => apply(document.createElementNS(SVG_NS, tag), attrs, children);

let counter = 0;
export const uid = (prefix: string): string => `${prefix}-${++counter}`;
