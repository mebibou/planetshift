import { useLayoutEffect, useRef } from 'react';

/** A ref to the latest `value`, for listeners that must not be added again when it changes. */
export const useLatest = <V>(value: V) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
};
