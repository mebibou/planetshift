import type { CSSProperties } from 'react';

/** The grid's side columns as custom properties: each at its width when open, else a thin rail. */
export const columns = (sides: Record<string, readonly [boolean, string]>): CSSProperties =>
  Object.fromEntries(
    Object.entries(sides).map(([name, [open, width]]) => [`--${name}-col`, open ? width : 'auto']),
  ) as CSSProperties;
