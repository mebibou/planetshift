export interface Size {
  width: number;
  height: number;
}

/** Where a box of `size` goes beside `at` on one axis: after it, else before it, else within 0..room. */
export const placeAlong = (at: number, size: number, room: number, gap: number): number =>
  at + gap + size <= room
    ? at + gap
    : at - gap - size >= 0
      ? at - gap - size
      : Math.max(0, Math.min(at - size / 2, room - size));

/** A tooltip's top left corner beside the point (x, y), inside its frame where it fits. */
export const placeTooltip = (
  x: number,
  y: number,
  tip: Size,
  frame: Size,
  gap = 12,
): { left: number; top: number } => ({
  left: placeAlong(x, tip.width, frame.width, gap),
  top: placeAlong(y, tip.height, frame.height, gap),
});

/** A popover's top left corner under its anchor, else above it, kept `gap` inside the viewport. */
export const placeBelow = (
  anchor: { left: number; top: number; bottom: number },
  tip: Size,
  view: Size,
  gap = 6,
): { left: number; top: number } => ({
  left: Math.max(gap, Math.min(anchor.left, view.width - tip.width - gap)),
  top:
    anchor.bottom + gap + tip.height <= view.height
      ? anchor.bottom + gap
      : Math.max(gap, anchor.top - gap - tip.height),
});
