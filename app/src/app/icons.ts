import { svg } from './dom';

const PATHS = {
  map: [
    'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z',
    'M3 12h18',
    'M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9s1.2-6.4 3.7-9z',
  ],
  table: ['M4 5h16v14H4z', 'M4 10h16', 'M4 15h16', 'M10 5v14'],
  download: ['M12 4v11', 'M7 10l5 5l5-5', 'M5 19h14'],
} as const;
export type Icon = keyof typeof PATHS;

/** A 20 px line icon drawn in the text colour, hidden from screen readers. */
export const icon = (name: Icon): SVGSVGElement =>
  svg(
    'svg',
    {
      class: 'icon',
      viewBox: '0 0 24 24',
      width: 20,
      height: 20,
      'aria-hidden': 'true',
      focusable: 'false',
    },
    ...PATHS[name].map((d) => svg('path', { d })),
  );
