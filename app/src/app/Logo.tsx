import { useId } from 'react';

/** Continents on one 32-unit-wide strip; drawn twice so the strip can scroll without a seam. */
const LAND = [
  'M1 7c2-3 7-4 10-2s3 4 1 6-1 5-4 5-3-1-4-3-4-4-3-6z',
  'M7 17c2-1 5 0 5 3s-1 6-3 8-3-2-3-5 0-5 1-6z',
  'M15 5c4-3 11-3 14 0s2 6-1 7-5 0-7 2-5 1-6-2 0-5 0-7z',
  'M18 15c3-1 6 0 6 3s-2 5-3 7-3-1-3-4-1-4 0-6z',
  'M25 21c2-1 5 0 5 2s-2 3-3 3-3-1-2-5z',
];

const Strip = ({ offset }: { offset: number }) => (
  <g transform={`translate(${offset} 0)`}>
    {LAND.map((d) => (
      <path key={d} d={d} />
    ))}
  </g>
);

/** The Planetshift mark: a planet that turns and greens. Decorative, so hidden from readers. */
export const PlanetMark = () => {
  const clip = useId();
  return (
    <svg viewBox="0 0 32 32" className="planet" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle cx={16} cy={16} r={14} />
        </clipPath>
      </defs>
      <circle className="planet-sea" cx={16} cy={16} r={14} />
      <g clipPath={`url(#${clip})`}>
        <g className="planet-land">
          <Strip offset={0} />
          <Strip offset={32} />
        </g>
      </g>
      <circle className="planet-rim" cx={16} cy={16} r={14} />
    </svg>
  );
};
