/**
 * A label as wide as its bold self, so that a switch turning it bold when chosen does not move its
 * neighbours: a hidden bold copy under it holds the width.
 */
export const Steady = ({ text }: { text: string }) => (
  <span
    data-text={text}
    className="inline-grid after:invisible after:h-0 after:overflow-hidden after:font-bold after:content-[attr(data-text)_/_''] after:select-none"
  >
    {text}
  </span>
);
