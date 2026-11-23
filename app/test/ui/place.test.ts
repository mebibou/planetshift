import { describe, expect, it } from 'vitest';
import { placeAlong, placeTooltip } from '../../src/app/place';

describe('tooltip placement', () => {
  it('goes after the point, else before it', () => {
    expect(placeAlong(10, 100, 320, 12)).toBe(22);
    expect(placeAlong(250, 100, 320, 12)).toBe(138);
  });

  it('stays inside a frame too narrow for either side', () => {
    expect(placeAlong(150, 280, 320, 12)).toBe(10);
    expect(placeAlong(20, 300, 320, 12)).toBe(0);
    expect(placeAlong(300, 300, 320, 12)).toBe(20);
    expect(placeAlong(100, 400, 320, 12)).toBe(0);
  });

  it('places both axes', () => {
    expect(
      placeTooltip(300, 200, { width: 200, height: 120 }, { width: 360, height: 240 }),
    ).toEqual({ left: 88, top: 68 });
  });
});
