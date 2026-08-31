export type FloatingPosition = { top: number; left: number; placement: 'top' | 'bottom'; arrowLeft: number };

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const GAP = 10;
const VIEWPORT_PADDING = 8;
const ARROW_PADDING = 14;

export function positionFloating(rect: DOMRect, popoverEl: HTMLElement): FloatingPosition {
  const popWidth = popoverEl.offsetWidth;
  const popHeight = popoverEl.offsetHeight;

  const centerX = rect.left + rect.width / 2;
  const desiredLeft = centerX - popWidth / 2;
  const left = clamp(desiredLeft, VIEWPORT_PADDING, window.innerWidth - popWidth - VIEWPORT_PADDING);
  let top = rect.top - popHeight - GAP;
  let placement: 'top' | 'bottom' = 'top';
  if (top < VIEWPORT_PADDING) {
    top = rect.bottom + GAP;
    placement = 'bottom';
  }
  top = clamp(top, VIEWPORT_PADDING, window.innerHeight - popHeight - VIEWPORT_PADDING);

  const arrowLeft = clamp(centerX - left, ARROW_PADDING, popWidth - ARROW_PADDING);
  return { top, left, placement, arrowLeft };
}
