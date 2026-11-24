import { useCallback, useState } from 'react';

/** Something drawn by its own code (D3, the map) once, and the ref that puts it in place. */
export const useDrawn = <V extends { el: Element }>(
  make: () => V,
): [V, (node: HTMLElement | null) => void] => {
  const [drawn] = useState(make);
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (node && node.firstChild !== drawn.el) {
        node.replaceChildren(drawn.el);
      }
    },
    [drawn],
  );
  return [drawn, ref];
};
