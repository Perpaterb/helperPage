import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { resolveLayout } from '../layout';
import { buildVirtualState } from '../virtualState';
import { useUI, Corner } from '../uiContext';
import { ItemView } from './ItemView';
import { EditItemModal } from './EditItemModal';
import { EditCategoryModal } from './EditCategoryModal';
import { AddItemModal } from './AddItemModal';
import { SizePos } from '../types';
import { resolveBg, textColorFor } from '../colors';

interface Props {
  parentId: string;
  slotCount: number;
  depth: number;
  searchQuery: string;
}

export function Container({ parentId, slotCount, depth, searchQuery }: Props) {
  const { state, dispatch } = useStore();
  const ui = useUI();
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [addingAt, setAddingAt] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Virtual state used for rendering only; dispatches still use real state.
  const vState = useMemo(
    () => buildVirtualState(state, ui.drag, ui.preview, slotCount),
    [state, ui.drag, ui.preview, slotCount]
  );

  const catHeight = (catId: string): number => {
    const cat = vState.categories[catId];
    if (!cat) return 1;
    if (cat.collapsed) return 1;
    const inner = resolveLayout(vState, catId, slotCount, inner => catHeight(inner));
    return Math.max(1, inner.totalRows) + 1;
  };

  const layout = useMemo(
    () => resolveLayout(vState, parentId, slotCount, catHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vState, parentId, slotCount]
  );

  const isEdit = state.editMode;

  const occupied = useMemo(() => {
    const rows = layout.totalRows + (isEdit ? 1 : 0);
    const grid: boolean[][] = Array.from({ length: rows }, () =>
      new Array(slotCount).fill(false)
    );
    for (const [, sp] of Object.entries(layout.items)) {
      for (let r = sp.y; r < sp.y + sp.h && r < rows; r++) {
        for (let c = sp.x; c < sp.x + sp.w && c < slotCount; c++) {
          grid[r][c] = true;
        }
      }
    }
    for (const [, cr] of Object.entries(layout.categories)) {
      for (let r = cr.y; r < cr.y + cr.h && r < rows; r++) {
        for (let c = 0; c < slotCount; c++) grid[r][c] = true;
      }
    }
    return grid;
  }, [layout, slotCount, isEdit]);

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
    // Align drag image with cursor offset so the ghost matches the grab point
    try {
      e.dataTransfer.setDragImage(itemEl, e.clientX - rect.left, e.clientY - rect.top);
    } catch {}
    ui.setDrag({
      itemId: id,
      fromParentId: parentId,
      offsetCol,
      offsetRow,
      w: sp.w,
      h: sp.h
    });
  };

  const onDragStartCategory = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/hp-id', id);
    e.dataTransfer.effectAllowed = 'move';
    // Categories are full-width; no preview offset needed
    ui.setDrag({
      itemId: id,
      fromParentId: parentId,
      offsetCol: 0,
      offsetRow: 0,
      w: slotCount,
      h: 1
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!isEdit) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const drag = ui.drag;
    if (!drag) return;
    // Only preview for items (categories drop as-is)
    if (!state.items[drag.itemId]) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const targetX = Math.max(0, Math.min(slotCount - drag.w, cell.col - drag.offsetCol));
    const targetY = Math.max(0, cell.row - drag.offsetRow);
    const cur = ui.preview;
    if (!cur || cur.parentId !== parentId || cur.x !== targetX || cur.y !== targetY) {
      ui.setPreview({ parentId, x: targetX, y: targetY });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    if (!isEdit) return;
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/hp-id');
    const drag = ui.drag;
    if (!id || !drag) {
      ui.setDrag(null);
      ui.setPreview(null);
      return;
    }
    const item = state.items[id];
    const cat = state.categories[id];
    if (item) {
      const cell = cellFromEvent(e);
      const targetX = cell
        ? Math.max(0, Math.min(slotCount - drag.w, cell.col - drag.offsetCol))
        : ui.preview?.x ?? 0;
      const targetY = cell ? Math.max(0, cell.row - drag.offsetRow) : ui.preview?.y ?? 0;
      if (drag.fromParentId !== parentId) {
        dispatch({
          type: 'MOVE_CHILD',
          id,
          toParentId: parentId,
          toIndex: (state.childOrder[parentId] || []).length
        });
      }
      dispatch({
        type: 'SET_ITEM_LAYOUT',
        id,
        slotCount,
        sp: { x: targetX, y: targetY, w: drag.w, h: drag.h }
      });
    } else if (cat) {
      const cell = cellFromEvent(e);
      dispatch({
        type: 'MOVE_CHILD',
        id,
        toParentId: parentId,
        toIndex: (state.childOrder[parentId] || []).length
      });
      dispatch({
        type: 'SET_CATEGORY_LAYOUT',
        id,
        slotCount,
        y: cell?.row ?? 0
      });
    }
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

  const containerStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${slotCount}, 1fr)`,
    gridTemplateRows: `repeat(${totalRows}, var(--slot-size))`
  };

  const matchesSearch = (id: string): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const it = state.items[id];
    if (it) {
      const data: any = it.data;
      return (
        (data.text || '').toLowerCase().includes(q) ||
        (data.url || '').toLowerCase().includes(q) ||
        (data.title || '').toLowerCase().includes(q) ||
        (data.markdown || '').toLowerCase().includes(q) ||
        (data.entries || []).some((e: any) => e.text.toLowerCase().includes(q))
      );
    }
    const ct = state.categories[id];
    if (ct) {
      if (ct.name.toLowerCase().includes(q)) return true;
      const kids = state.childOrder[id] || [];
      return kids.some(k => matchesSearch(k));
    }
    return true;
  };

  return (
    <div
      className="container-grid"
      ref={gridRef}
      style={containerStyle}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {Object.entries(layout.items).map(([id, sp]) => {
        const item = vState.items[id];
        if (!item) return null;
        if (!matchesSearch(id)) return null;
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
            style={{
              gridColumn: `${sp.x + 1} / span ${sp.w}`,
              gridRow: `${sp.y + 1} / span ${sp.h}`,
              background: bg,
              color: fg
            }}
          />
        );
      })}

      {Object.entries(layout.categories).map(([id, cr]) => {
        const cat = vState.categories[id];
        if (!cat) return null;
        if (!matchesSearch(id)) return null;
        return (
          <div
            key={id}
            className={'category depth-' + depth + (cat.collapsed ? ' collapsed' : '')}
            style={{
              gridColumn: `1 / span ${slotCount}`,
              gridRow: `${cr.y + 1} / span ${cr.h}`,
              background: cat.color + (cat.color.length === 7 ? 'e6' : ''),
              borderColor: cat.color
            }}
            draggable={isEdit && !ui.resizeMode}
            onDragStart={e => {
              e.stopPropagation();
              onDragStartCategory(e, id);
            }}
            onDragEnd={onDragEndItem}
          >
            <div
              className="category-header"
              style={{ background: cat.color }}
              onClick={() => {
                if (!isEdit && !ui.resizeMode) {
                  dispatch({
                    type: 'UPDATE_CATEGORY',
                    id,
                    patch: { collapsed: !cat.collapsed }
                  });
                }
              }}
            >
              <span className="category-name">
                {cat.collapsed ? '▶' : '▼'} {cat.name}
              </span>
              {isEdit && !ui.resizeMode && (
                <div className="category-actions">
                  <button
                    className="icon-btn"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      setEditCatId(id);
                    }}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      dispatch({ type: 'RESET_LAYOUTS', parentId: id, slotCount });
                    }}
                    title="Reset layout at this width"
                  >
                    ⟲
                  </button>
                </div>
              )}
            </div>
            {!cat.collapsed && depth < 5 && (
              <div className="category-inner">
                <Container
                  parentId={id}
                  slotCount={slotCount}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                />
              </div>
            )}
          </div>
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
      {editCatId && (
        <EditCategoryModal
          catId={editCatId}
          onClose={() => setEditCatId(null)}
          onDelete={() => {
            dispatch({ type: 'DELETE_CATEGORY', id: editCatId });
            setEditCatId(null);
          }}
        />
      )}
      {addingAt && (
        <AddItemModal
          onPick={type => {
            dispatch({
              type: 'ADD_ITEM',
              parentId,
              itemType: type,
              slotCount,
              position: addingAt
            });
            setAddingAt(null);
          }}
          onClose={() => setAddingAt(null)}
        />
      )}
    </div>
  );
}
