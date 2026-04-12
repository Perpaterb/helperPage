import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { resolveLayout, packItems, availableSize } from '../layout';
import { buildVirtualState } from '../virtualState';
import { useUI, Corner } from '../uiContext';
import { ItemView } from './ItemView';
import { EditItemModal } from './EditItemModal';
import { AddItemModal } from './AddItemModal';
import { SizePos } from '../types';
import { resolveBg, textColorFor } from '../colors';
import { startEdgeScroll, stopEdgeScroll, updateEdgeScroll } from '../edgeScroll';

interface Props {
  slotCount: number;
  searchQuery: string;
}

export function Container({ slotCount, searchQuery }: Props) {
  const { state, dispatch } = useStore();
  const ui = useUI();
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [addingAt, setAddingAt] = useState<{ x: number; y: number } | null>(null);
  const [dragRowLock, setDragRowLock] = useState<number | null>(null);
  const dragCursorY = useRef(0);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Listen for long-press-slot events dispatched by App when entering edit mode
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      setAddingAt({ x, y });
    };
    window.addEventListener('hp-longpress-slot', handler);
    return () => window.removeEventListener('hp-longpress-slot', handler);
  }, []);

  const vState = useMemo(
    () => buildVirtualState(state, ui.drag, ui.preview, slotCount),
    [state, ui.drag, ui.preview, slotCount]
  );

  const layout = useMemo(
    () => resolveLayout(vState, slotCount),
    [vState, slotCount]
  );

  const isEdit = state.editMode;
  const totalRows = Math.max(1, layout.totalRows + (isEdit ? 1 : 0));

  // --- Mouse-based drag with controlled row expansion ---
  // Bottom 15%: add one row + scroll down every 200ms.
  // Top 15%: scroll up every 200ms. No row removal during drag.
  // After release: unlock rows, grid recalculates to fit content.
  const beginDrag = (id: string, startEv: React.MouseEvent) => {
    const item = state.items[id];
    if (!item || !gridRef.current) return;
    startEv.preventDefault();
    const sp: SizePos = layout.items[id] || { x: 0, y: 0, w: 3, h: 3 };
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / slotCount;
    const slotPx =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size')) || 40;
    const gapPx =
      parseFloat(getComputedStyle(gridRef.current).rowGap || getComputedStyle(gridRef.current).gap || '4');
    const cellH = slotPx + gapPx;
    const startX = startEv.clientX;
    const startY = startEv.clientY;
    const startScrollY = window.scrollY;
    const startPos = { x: sp.x, y: sp.y };

    // Lock current row count — can only grow, never shrink during drag
    setDragRowLock(totalRows);

    ui.setDrag({
      itemId: id,
      fromParentId: 'root',
      offsetCol: 0,
      offsetRow: 0,
      w: sp.w,
      h: sp.h
    });
    ui.setPreview({ parentId: 'root', x: sp.x, y: sp.y });
    dragCursorY.current = startEv.clientY;

    const computeTarget = (clientX: number, clientY: number) => {
      const scrollDelta = window.scrollY - startScrollY;
      const dxC = Math.round((clientX - startX) / cellW);
      const dyC = Math.round((clientY - startY + scrollDelta) / cellH);
      return {
        x: Math.max(0, Math.min(slotCount - sp.w, startPos.x + dxC)),
        y: Math.max(0, startPos.y + dyC)
      };
    };

    // 200ms interval: only the bottom 15% and top 80px trigger scroll.
    const TOP_EDGE_PX = 80;
    const scrollLock = { enabled: true };
    const interval = setInterval(() => {
      if (!scrollLock.enabled) return;
      const vh = window.innerHeight;
      const cy = dragCursorY.current;
      if (cy >= Math.floor(vh * 0.85)) {
        setDragRowLock(prev => (prev != null ? prev + 1 : null));
        window.scrollBy(0, cellH);
      } else if (cy <= TOP_EDGE_PX && window.scrollY > 0) {
        window.scrollBy(0, -cellH);
      }
    }, 200);

    const move = (ev: MouseEvent) => {
      dragCursorY.current = ev.clientY;
      const { x, y } = computeTarget(ev.clientX, ev.clientY);
      const cur = ui.preview;
      if (!cur || cur.x !== x || cur.y !== y) {
        ui.setPreview({ parentId: 'root', x, y });
      }
    };

    const up = (ev: MouseEvent) => {
      clearInterval(interval);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const { x, y } = computeTarget(ev.clientX, ev.clientY);
      dispatch({
        type: 'SET_ITEM_LAYOUT',
        id,
        slotCount,
        sp: { x, y, w: sp.w, h: sp.h }
      });
      ui.setDrag(null);
      ui.setPreview(null);
      // Unlock rows — grid recalculates to fit content on next render
      setDragRowLock(null);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // --- Corner resize ---
  const beginCornerResize = (id: string, corner: Corner, startEv: React.MouseEvent) => {
    const item = state.items[id];
    if (!item || !gridRef.current) return;
    const cur: SizePos =
      layout.items[id] || item.layouts[slotCount] || { x: 0, y: 0, w: 1, h: 1 };
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / slotCount;
    const slotPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size')) || 40;
    const gapPx = parseFloat(getComputedStyle(gridRef.current).rowGap || getComputedStyle(gridRef.current).gap || '4');
    const cellH = slotPx + gapPx;
    const startX = startEv.clientX;
    const startY = startEv.clientY;
    const startScrollY = window.scrollY;
    const start = { ...cur };
    ui.setActiveResize({ itemId: id, corner });
    startEdgeScroll();

    const move = (ev: MouseEvent) => {
      updateEdgeScroll(ev.clientY);
      const scrollDelta = window.scrollY - startScrollY;
      const dxC = Math.round((ev.clientX - startX) / cellW);
      const dyC = Math.round((ev.clientY - startY + scrollDelta) / cellH);
      let nx = start.x;
      let ny = start.y;
      let nw = start.w;
      let nh = start.h;
      if (corner === 'br') {
        nw = start.w + dxC;
        nh = start.h + dyC;
      } else if (corner === 'tr') {
        nw = start.w + dxC;
        nh = start.h - dyC;
        ny = start.y + dyC;
      } else if (corner === 'bl') {
        nw = start.w - dxC;
        nh = start.h + dyC;
        nx = start.x + dxC;
      } else if (corner === 'tl') {
        nw = start.w - dxC;
        nh = start.h - dyC;
        nx = start.x + dxC;
        ny = start.y + dyC;
      }
      nw = Math.max(1, nw);
      nh = Math.max(1, nh);
      if (nx < 0) {
        nw = nw + nx;
        nx = 0;
      }
      if (ny < 0) {
        nh = nh + ny;
        ny = 0;
      }
      nw = Math.max(1, nw);
      nh = Math.max(1, nh);
      if (nx + nw > slotCount) nw = slotCount - nx;
      dispatch({
        type: 'SET_ITEM_LAYOUT',
        id,
        slotCount,
        sp: { x: nx, y: ny, w: nw, h: nh }
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      stopEdgeScroll();
      ui.setActiveResize(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const itemMatchesSearch = (id: string): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const it = state.items[id];
    if (!it) return false;
    const data: any = it.data;
    return (
      (data.text || '').toLowerCase().includes(q) ||
      (data.url || '').toLowerCase().includes(q) ||
      (data.title || '').toLowerCase().includes(q) ||
      (data.markdown || '').toLowerCase().includes(q) ||
      (data.entries || []).some((e: any) => e.text.toLowerCase().includes(q))
    );
  };

  const searchLayout = useMemo(() => {
    if (!searchQuery) return null;
    const matching: { id: string; w: number; h: number }[] = [];
    for (const [id, sp] of Object.entries(layout.items)) {
      if (itemMatchesSearch(id)) {
        matching.push({ id, w: sp.w, h: sp.h });
      }
    }
    return packItems(matching, slotCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, layout, slotCount]);

  const displayItems = searchLayout ? searchLayout.items : layout.items;
  // During resize: buffer so there's space to stretch into.
  const resizeBuffer = ui.activeResize ? 30 : 0;
  const baseTotalRows = searchLayout
    ? Math.max(1, searchLayout.totalRows + (isEdit ? 1 : 0))
    : totalRows;
  // During drag: rows can only grow (locked), never shrink.
  // After drag: unlock and recalculate normally.
  const displayTotalRows = Math.max(
    baseTotalRows + resizeBuffer,
    dragRowLock ?? 0
  );

  const occupied = useMemo(() => {
    const rows = displayTotalRows;
    const grid: boolean[][] = Array.from({ length: rows }, () =>
      new Array(slotCount).fill(false)
    );
    for (const [, sp] of Object.entries(displayItems)) {
      for (let r = sp.y; r < sp.y + sp.h && r < rows; r++) {
        for (let c = sp.x; c < sp.x + sp.w && c < slotCount; c++) {
          grid[r][c] = true;
        }
      }
    }
    return grid;
  }, [displayItems, displayTotalRows, slotCount]);

  const containerStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${slotCount}, 1fr)`,
    gridTemplateRows: `repeat(${displayTotalRows}, var(--slot-size))`
  };

  return (
    <div
      className="container-grid"
      ref={gridRef}
      style={containerStyle}
    >
      {Object.entries(displayItems).map(([id, sp]) => {
        const item = vState.items[id];
        if (!item) return null;
        const isDragging = ui.drag?.itemId === id;
        const activeCorner =
          ui.activeResize?.itemId === id ? ui.activeResize.corner : null;
        const bg = resolveBg(item.data as any, state.darkMode);
        const fg = textColorFor(bg);
        return (
          <ItemView
            key={id}
            item={item}
            editMode={isEdit}
            resizeMode={ui.resizeMode}
            isDragging={isDragging}
            activeCorner={activeCorner}
            onEdit={() => setEditItemId(id)}
            onStartResize={() => ui.setResizeMode(true)}
            onExitResize={() => ui.setResizeMode(false)}
            onMoveStart={e => beginDrag(id, e)}
            onResizeCornerDown={(corner, ev) => beginCornerResize(id, corner, ev)}
            searchQuery={searchQuery}
            style={{
              gridColumn: `${sp.x + 1} / span ${sp.w}`,
              gridRow: `${sp.y + 1} / span ${sp.h}`,
              background: bg,
              color: fg
            }}
          />
        );
      })}

      {isEdit &&
        !ui.resizeMode &&
        !ui.drag &&
        occupied.map((row, r) =>
          row.map((cell, c) =>
            cell ? null : (
              <button
                key={`plus-${r}-${c}`}
                className="plus-cell"
                style={{
                  gridColumn: `${c + 1} / span 1`,
                  gridRow: `${r + 1} / span 1`
                }}
                onClick={() => setAddingAt({ x: c, y: r })}
                title="Add item"
              >
                +
              </button>
            )
          )
        )}

      {editItemId && (
        <EditItemModal
          itemId={editItemId}
          onClose={() => setEditItemId(null)}
          onDelete={() => {
            dispatch({ type: 'DELETE_ITEM', id: editItemId });
            setEditItemId(null);
          }}
        />
      )}
      {addingAt && (
        <AddItemModal
          onPick={type => {
            const size = availableSize(addingAt.x, addingAt.y, slotCount, occupied);
            dispatch({
              type: 'ADD_ITEM',
              itemType: type,
              slotCount,
              position: addingAt,
              size
            });
            setAddingAt(null);
          }}
          onClose={() => setAddingAt(null)}
        />
      )}
    </div>
  );
}
