import { describe, expect, it } from 'vitest';
import { placeAlong, placeBelow, placeTooltip } from '../../src/app/place';

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

describe('info placement', () => {
  const view = { width: 360, height: 640 };
  const tip = { width: 240, height: 80 };

  it('goes under its button, aligned on it', () => {
    expect(placeBelow({ left: 40, top: 100, bottom: 120 }, tip, view)).toEqual({
      left: 40,
      top: 126,
    });
  });

  it('goes above near the bottom and stays inside on the right', () => {
    expect(placeBelow({ left: 300, top: 600, bottom: 620 }, tip, view)).toEqual({
      left: 114,
      top: 514,
    });
  });
});
