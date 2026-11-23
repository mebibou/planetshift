import { describe, expect, it } from 'vitest';
import { parseTourFlag, shouldShowTour } from '../../src/app/tour';

describe('guided start', () => {
  it('reads the tour flag from the query', () => {
    expect(parseTourFlag('?tour=1')).toBe(true);
    expect(parseTourFlag('?data=fixtures&tour=0')).toBe(false);
    expect(parseTourFlag('?tour=yes')).toBeNull();
    expect(parseTourFlag('')).toBeNull();
  });

  it('shows on a first visit to Explore, and as the flag says', () => {
    expect(shouldShowTour(null, false, 'explore')).toBe(true);
    expect(shouldShowTour(null, true, 'explore')).toBe(false);
    expect(shouldShowTour(null, false, 'methodology')).toBe(false);
    expect(shouldShowTour(true, true, 'methodology')).toBe(true);
    expect(shouldShowTour(false, false, 'explore')).toBe(false);
  });
});
