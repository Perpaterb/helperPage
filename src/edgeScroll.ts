// Auto-scroll when the cursor is near the top or bottom of the viewport.
// Two zones: slow (outer 15%) and fast (outer 5%).

let active = false;
let cursorY = 0;
let rafId: number | null = null;

const SLOW_ZONE = 0.15;
const FAST_ZONE = 0.05;
const SLOW_SPEED = 4;
const FAST_SPEED = 16;

function tick() {
  if (!active) return;
  const vh = window.innerHeight;
  const bottomDist = vh - cursorY;
  const topDist = cursorY;

  if (bottomDist < vh * FAST_ZONE) {
    window.scrollBy(0, FAST_SPEED);
  } else if (bottomDist < vh * SLOW_ZONE) {
    window.scrollBy(0, SLOW_SPEED);
  } else if (topDist < vh * FAST_ZONE) {
    window.scrollBy(0, -FAST_SPEED);
  } else if (topDist < vh * SLOW_ZONE) {
    window.scrollBy(0, -SLOW_SPEED);
  }

  rafId = requestAnimationFrame(tick);
}

export function startEdgeScroll() {
  if (active) return;
  active = true;
  rafId = requestAnimationFrame(tick);
}

export function stopEdgeScroll() {
  active = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function updateEdgeScroll(clientY: number) {
  cursorY = clientY;
}
