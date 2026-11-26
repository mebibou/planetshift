const PATHS = {
  map: [
    'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z',
    'M3 12h18',
    'M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9s1.2-6.4 3.7-9z',
  ],
  table: ['M4 5h16v14H4z', 'M4 10h16', 'M4 15h16', 'M10 5v14'],
  download: ['M12 4v11', 'M7 10l5 5l5-5', 'M5 19h14'],
  heat: ['M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z', 'M12 9v6.5', 'M17 6h2', 'M17 9.5h2'],
  coral: [
    'M12 21v-7',
    'M12 14c0-3-3-3.5-3-7',
    'M12 14c0-2 3.5-2.5 3.5-6',
    'M9 7V4.5',
    'M15.5 8V5.5',
    'M10.3 11.5C8 11.5 6.5 10 6.5 7.5',
    'M14 12c2.2 0 3.6-1.3 3.6-3.5',
    'M7.5 21h9',
  ],
  ice: [
    'M12 3v18',
    'M4.2 7.5l15.6 9',
    'M19.8 7.5l-15.6 9',
    'M9.5 4.5l2.5 2 2.5-2',
    'M9.5 19.5l2.5-2 2.5 2',
  ],
  heatwave: [
    'M12 4.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
    'M12 1.5V2.5',
    'M6 7.5h1',
    'M17 7.5h1',
    'M7.8 3.3l.7.7',
    'M15.5 4l.7-.7',
    'M3 15c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0 3 1.4 4.5 0',
    'M3 19.5c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0 3 1.4 4.5 0',
  ],
  species: ['M5 19c0-8.3 5.7-14 14-14 0 8.3-5.7 14-14 14z', 'M5 19l8.5-8.5'],
  drought: ['M12 3.5s-5.5 6.4-5.5 10.5a5.5 5.5 0 0 0 11 0c0-4.1-5.5-10.5-5.5-10.5z', 'M4 4l16 16'],
  levers: ['M4 7h9', 'M17 7h3', 'M15 5v4', 'M4 17h3', 'M11 17h9', 'M9 15v4'],
  options: [
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
    'M12 3v3',
    'M12 18v3',
    'M3 12h3',
    'M18 12h3',
    'M5.6 5.6l2.1 2.1',
    'M16.3 16.3l2.1 2.1',
    'M5.6 18.4l2.1-2.1',
    'M16.3 7.7l2.1-2.1',
  ],
  panelLeft: ['M4 5h16v14H4z', 'M9 5v14'],
  panelRight: ['M4 5h16v14H4z', 'M15 5v14'],
  back: ['M15 5l-7 7l7 7'],
  more: ['M9 5l7 7l-7 7'],
} as const;
export type IconName = keyof typeof PATHS;

/** A 20 px line icon drawn in the text colour, hidden from screen readers. */
export const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => (
  <svg
    className="icon flex-none fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    {PATHS[name].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);
