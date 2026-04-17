import { AppState, SizePos } from './types';

export interface ResolvedLayout {
  items: Record<string, SizePos>;
  totalRows: number;
}

export function resolveLayout(
  state: AppState,
  slotCount: number,
  priorityId?: string
): ResolvedLayout {
  const order = state.childOrder[state.activeTab] || [];
  const occupied: boolean[][] = [];

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
  const findNext = (w: number, h: number): { x: number; y: number } => {
    let r = 0;
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

  const placeExplicit = (cid: string) => {
    const it = state.items[cid];
    if (!it) return;
    const lay = it.layouts[slotCount];
    if (!lay) return;
    const w = Math.max(1, Math.min(lay.w, slotCount));
    const h = Math.max(1, lay.h);
    let x = Math.max(0, Math.min(lay.x, slotCount - w));
    let y = Math.max(0, lay.y);
    const isFolder = it.type === 'folder';
    // Folders: only the header row (top) occupies slots; body is transparent
    const occH = isFolder ? 1 : h;
    for (let attempt = 0; attempt < 200; attempt++) {
      if (isFree(x, y, w, occH)) break;
      y++;
    }
    mark(x, y, w, occH);
    items[cid] = { x, y, w, h };
  };

  // Place priority item first so it wins its position
  if (priorityId && order.includes(priorityId)) {
    placeExplicit(priorityId);
  }

  // Place remaining items with explicit layouts (in childOrder)
  for (const cid of order) {
    if (items[cid]) continue;
    placeExplicit(cid);
  }

  // Pack remaining items (no explicit layout at this slot count)
  for (const cid of order) {
    if (items[cid]) continue;
    const it = state.items[cid];
    if (!it) continue;
    const sizes = Object.values(it.layouts).filter(Boolean) as SizePos[];
    const last = sizes[sizes.length - 1];
    const w = last?.w ? Math.min(last.w, slotCount) : 3;
    const h = last?.h || 3;
    const isFolder = it.type === 'folder';
    const occH = isFolder ? 1 : h;
    const { x, y } = findNext(w, occH);
    mark(x, y, w, occH);
    items[cid] = { x, y, w, h };
  }

  // totalRows must account for the full visual height of every item,
  // including folder bodies whose rows aren't marked as occupied.
  let maxRow = occupied.length;
  for (const sp of Object.values(items)) {
    maxRow = Math.max(maxRow, sp.y + sp.h);
  }
  return { items, totalRows: maxRow };
}

// Pack a filtered list of items top-left (preserving w×h).
export function packItems(
  itemList: { id: string; w: number; h: number }[],
  slotCount: number
): { items: Record<string, SizePos>; totalRows: number } {
  const occupied: boolean[][] = [];
  const result: Record<string, SizePos> = {};
  const ensureRow = (r: number) => {
    while (occupied.length <= r) occupied.push(new Array(slotCount).fill(false));
  };
  const isFree = (x: number, y: number, w: number, h: number) => {
    for (let rr = y; rr < y + h; rr++) {
      for (let cc = x; cc < x + w; cc++) {
        if (cc >= slotCount) return false;
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
  for (const item of itemList) {
    const w = Math.min(item.w, slotCount);
    let r = 0;
    let placed = false;
    while (!placed) {
      ensureRow(r);
      for (let c = 0; c + w <= slotCount; c++) {
        if (isFree(c, r, w, item.h)) {
          mark(c, r, w, item.h);
          result[item.id] = { x: c, y: r, w, h: item.h };
          placed = true;
          break;
        }
      }
      if (!placed) r++;
      if (r > 500) break;
    }
  }
  return { items: result, totalRows: occupied.length };
}

// Compute available space (up to 3×3) at a target position.
export function availableSize(
  x: number,
  y: number,
  slotCount: number,
  occupied: boolean[][]
): { w: number; h: number } {
  let maxW = 0;
  for (let c = x; c < Math.min(x + 3, slotCount); c++) {
    if (occupied[y]?.[c]) break;
    maxW++;
  }
  if (maxW === 0) return { w: 1, h: 1 };
  let maxH = 0;
  for (let r = y; r < y + 3; r++) {
    let rowClear = true;
    for (let c = x; c < x + maxW; c++) {
      if (occupied[r]?.[c]) {
        rowClear = false;
        break;
      }
    }
    if (!rowClear) break;
    maxH++;
  }
  return { w: Math.max(1, maxW), h: Math.max(1, maxH) };
}

// Fixed slot width — 6 slots at ~500px = ~83px per slot.
export const SLOT_PX = 500 / 6;
// Mobile (touch-only) scale: 30% smaller slots.
export const MOBILE_SCALE = 0.7;

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function effectiveSlotPx(): number {
  return isMobileDevice() ? SLOT_PX * MOBILE_SCALE : SLOT_PX;
}

export function slotsForWidth(boardWidthPx: number, depth: number, slotPx: number = SLOT_PX): number {
  const raw = Math.floor(boardWidthPx / slotPx);
  // Round down to nearest multiple of 3, clamp to 6–30
  let s = Math.floor(raw / 3) * 3;
  s = Math.max(6, Math.min(30, s));
  s = Math.max(1, s - depth);
  return Math.min(30, Math.max(3, s));
}
