import { attempt } from './attempt';
import type { View } from './url';

export const TOUR_STEPS = ['chart', 'levers', 'causes'] as const;

const KEY = 'planetshift.tour';
const SEEN = 'seen';

/** `?tour=1` opens the guided start whatever the browser remembers, `?tour=0` keeps it closed. */
export const parseTourFlag = (query: string): boolean | null => {
  const value = new URLSearchParams(query).get('tour');
  return value === '1' ? true : value === '0' ? false : null;
};

export const shouldShowTour = (flag: boolean | null, seen: boolean, view: View): boolean =>
  flag ?? (!seen && view === 'explore');

export const readTourSeen = (): boolean => attempt(() => localStorage.getItem(KEY) === SEEN, false);

export const storeTourSeen = (): void => {
  try {
    localStorage.setItem(KEY, SEEN);
  } catch {
    // storage unavailable: the guided start shows again on the next visit
  }
};
