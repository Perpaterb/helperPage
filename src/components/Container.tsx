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

interface Props {
  slotCount: number;
  searchQuery: string;
}

export function Container({ slotCount, searchQuery }: Props) {
  const { state, dispatch } = useStore();
  const ui = useUI();
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [addingAt, setAddingAt] = useState<{ x: number; y: number } | null>(null);
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

  // --- Drag & drop ---
  const cellFromEvent = (e: React.DragEvent | React.MouseEvent) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = (e as any).clientX - rect.left;
    const y = (e as any).clientY - rect.top;
    const col = Math.floor((x / rect.width) * slotCount);
    const rowHeight = rect.height / Math.max(1, totalRows);
    const row = Math.floor(y / rowHeight);
    return {
      col: Math.max(0, Math.min(slotCount - 1, col)),
      row: Math.max(0, row)
    };
  };

  const onDragStartItem = (e: React.DragEvent, id: string) => {
    const item = state.items[id];
    if (!item) return;
    const itemEl = e.currentTarget as HTMLElement;
    const rect = itemEl.getBoundingClientRect();
    const sp: SizePos = layout.items[id] || { x: 0, y: 0, w: 1, h: 1 };
    const cellW = rect.width / sp.w;
    const cellH = rect.height / sp.h;
    const offsetCol = Math.max(0, Math.min(sp.w - 1, Math.floor((e.clientX - rect.left) / cellW)));
    const offsetRow = Math.max(0, Math.min(sp.h - 1, Math.floor((e.clientY - rect.top) / cellH)));
    e.dataTransfer.setData('text/hp-id', id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setDragImage(itemEl, e.clientX - rect.left, e.clientY - rect.top);
    } catch {}
    ui.setDrag({
      itemId: id,
      fromParentId: 'root',
      offsetCol,
      offsetRow,
      w: sp.w,
      h: sp.h
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!isEdit) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const drag = ui.drag;
    if (!drag || !state.items[drag.itemId]) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const targetX = Math.max(0, Math.min(slotCount - drag.w, cell.col - drag.offsetCol));
    const targetY = Math.max(0, cell.row - drag.offsetRow);
    const cur = ui.preview;
    if (!cur || cur.parentId !== 'root' || cur.x !== targetX || cur.y !== targetY) {
      ui.setPreview({ parentId: 'root', x: targetX, y: targetY });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    if (!isEdit) return;
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/hp-id');
    const drag = ui.drag;
    if (!id || !drag || !state.items[id]) {
      ui.setDrag(null);
      ui.setPreview(null);
      return;
    }
    const cell = cellFromEvent(e);
    const targetX = cell
      ? Math.max(0, Math.min(slotCount - drag.w, cell.col - drag.offsetCol))
      : ui.preview?.x ?? 0;
    const targetY = cell ? Math.max(0, cell.row - drag.offsetRow) : ui.preview?.y ?? 0;
    dispatch({
      type: 'SET_ITEM_LAYOUT',
      id,
      slotCount,
      sp: { x: targetX, y: targetY, w: drag.w, h: drag.h }
    });
    ui.setDrag(null);
    ui.setPreview(null);
  };

  const onDragEndItem = () => {
    ui.setDrag(null);
    ui.setPreview(null);
  };

  // --- Corner resize ---
  const beginCornerResize = (id: string, corner: Corner, startEv: React.MouseEvent) => {
    const item = state.items[id];
    if (!item || !gridRef.current) return;
    const cur: SizePos =
      layout.items[id] || item.layouts[slotCount] || { x: 0, y: 0, w: 1, h: 1 };
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / slotCount;
    const cellH = rect.height / Math.max(1, totalRows);
    const startX = startEv.clientX;
    const startY = startEv.clientY;
    const start = { ...cur };
    ui.setActiveResize({ itemId: id, corner });

    const move = (ev: MouseEvent) => {
      const dxC = Math.round((ev.clientX - startX) / cellW);
      const dyC = Math.round((ev.clientY - startY) / cellH);
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
  const displayTotalRows = searchLayout
    ? Math.max(1, searchLayout.totalRows + (isEdit ? 1 : 0))
    : totalRows;

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
      onDragOver={onDragOver}
      onDrop={onDrop}
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
            onDragStart={e => onDragStartItem(e, id)}
            onDragEnd={onDragEndItem}
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
