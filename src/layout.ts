import { AppState, SizePos } from './types';

// Given a parent container and slot count, produce the resolved layout:
// - items get x,y,w,h; categories get y and height (computed recursively)
// Returns: { resolvedItems: {id: SizePos}, categoryRows: {id: {y, h}}, totalRows }
export interface ResolvedLayout {
  items: Record<string, SizePos>;
  categories: Record<string, { y: number; h: number }>;
  totalRows: number;
}

// Simple packer: walks through childOrder, categories break rows and take full width,
// items try to sit at their explicit (x,y,w,h) if set; otherwise packed into next free cells.
export function resolveLayout(
  state: AppState,
  parentId: string,
  slotCount: number,
  getCategoryHeight: (catId: string) => number
): ResolvedLayout {
  const order = state.childOrder[parentId] || [];
  const occupied: boolean[][] = []; // [row][col]

  const ensureRow = (r: number) => {
    while (occupied.length <= r) occupied.push(new Array(slotCount).fill(false));
  };
  const isFree = (x: number, y: number, w: number, h: number) => {
    for (let rr = y; rr < y + h; rr++) {
      for (let cc = x; cc < x + w; cc++) {
        if (cc < 0 || cc >= slotCount) return false;
        ensureRow(rr);
        if (occupied[rr][cc]) return false;
      }
    }
    return true;
  };
  const mark = (x: number, y: number, w: number, h: number) => {
    for (let rr = y; rr < y + h; rr++) {
      for (let cc = x; cc < x + w; cc++) {
        ensureRow(rr);
        occupied[rr][cc] = true;
      }
    }
  };
  const findNext = (w: number, h: number, startRow = 0): { x: number; y: number } => {
    let r = startRow;
    while (true) {
      ensureRow(r);
      for (let c = 0; c + w <= slotCount; c++) {
        if (isFree(c, r, w, h)) return { x: c, y: r };
      }
      r++;
      if (r > 500) return { x: 0, y: r };
    }
  };

  const items: Record<string, SizePos> = {};
  const cats: Record<string, { y: number; h: number }> = {};

  // Separate items with explicit layouts vs defaults.
  // Place explicit first so collisions with packed get pushed.
  const explicitItems: { id: string; sp: SizePos }[] = [];
  const defaultItems: { id: string; w: number; h: number }[] = [];
  const explicitCats: { id: string; y: number }[] = [];
  const defaultCats: string[] = [];

  for (const cid of order) {
    const it = state.items[cid];
    const ct = state.categories[cid];
    if (it) {
      const lay = it.layouts[slotCount];
      if (lay) explicitItems.push({ id: cid, sp: lay });
      else {
        // fallback: use last-known size if any, else 1x1
        const sizes = Object.values(it.layouts).filter(Boolean) as SizePos[];
        const last = sizes[sizes.length - 1];
        defaultItems.push({ id: cid, w: last?.w ? Math.min(last.w, slotCount) : 1, h: last?.h || 1 });
      }
    } else if (ct) {
      const lay = ct.layouts[slotCount];
      if (lay) explicitCats.push({ id: cid, y: lay.y });
      else defaultCats.push(cid);
    }
  }

  // Place explicit items (clamped to bounds)
  for (const { id, sp } of explicitItems) {
    const w = Math.max(1, Math.min(sp.w, slotCount));
    const h = Math.max(1, sp.h);
    let x = Math.max(0, Math.min(sp.x, slotCount - w));
    let y = Math.max(0, sp.y);
    // Find free spot starting at (x,y) scanning downward if collision
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      if (isFree(x, y, w, h)) {
        placed = true;
      } else {
        y++;
      }
    }
    mark(x, y, w, h);
    items[id] = { x, y, w, h };
  }

  // Now process in childOrder, mixing defaults with explicit cats inline
  for (const cid of order) {
    if (items[cid]) continue; // already placed (explicit)
    const it = state.items[cid];
    const ct = state.categories[cid];
    if (it) {
      // default item: pack
      const sizes = Object.values(it.layouts).filter(Boolean) as SizePos[];
      const last = sizes[sizes.length - 1];
      const w = last?.w ? Math.min(last.w, slotCount) : 1;
      const h = last?.h || 1;
      const { x, y } = findNext(w, h);
      mark(x, y, w, h);
      items[cid] = { x, y, w, h };
    } else if (ct) {
      // categories full-width break row
      const h = Math.max(1, getCategoryHeight(cid));
      // Find next row where full-width block is free
      let r = 0;
      ensureRow(r);
      while (true) {
        let clear = true;
        for (let c = 0; c < slotCount; c++) {
          ensureRow(r);
          if (occupied[r][c]) {
            clear = false;
            break;
          }
        }
        if (clear) {
          let allClear = true;
          for (let rr = r; rr < r + h && allClear; rr++) {
            ensureRow(rr);
            for (let cc = 0; cc < slotCount; cc++) {
              if (occupied[rr][cc]) {
                allClear = false;
                break;
              }
            }
          }
          if (allClear) break;
        }
        r++;
      }
      for (let rr = r; rr < r + h; rr++) {
        ensureRow(rr);
        for (let cc = 0; cc < slotCount; cc++) occupied[rr][cc] = true;
      }
      cats[cid] = { y: r, h };
    }
  }

  return { items, categories: cats, totalRows: occupied.length };
}

// Figure out slot count based on board width in px.
// Targets (board width = ~75% of viewport on wide screens):
//   1080p viewport -> board ~1440 -> 4 slots
//   1440p viewport -> board ~1920 -> 6 slots
//   ultrawide 3440 -> board ~2580 -> 8 slots
//   4K 3840       -> board ~2880 -> 10 slots
export function slotsForWidth(boardWidthPx: number, depth: number): number {
  const w = boardWidthPx;
  let s: number;
  if (w >= 2700) s = 10;
  else if (w >= 2200) s = 8;
  else if (w >= 1700) s = 6;
  else if (w >= 1100) s = 4;
  else if (w >= 780) s = 3;
  else if (w >= 500) s = 2;
  else s = 1;
  s = Math.max(1, s - Math.floor(depth / 2));
  return Math.min(10, Math.max(1, s));
}
