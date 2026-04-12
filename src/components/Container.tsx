import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { resolveLayout } from '../layout';
import { ItemView } from './ItemView';
import { EditItemModal } from './EditItemModal';
import { EditCategoryModal } from './EditCategoryModal';
import { AddItemModal } from './AddItemModal';
import { SizePos } from '../types';

interface Props {
  parentId: string; // 'root' or category id
  slotCount: number;
  depth: number;
  searchQuery: string;
}

// A recursive container that renders items + nested categories in a slot grid.
export function Container({ parentId, slotCount, depth, searchQuery }: Props) {
  const { state, dispatch } = useStore();
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [addingAt, setAddingAt] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Compute category heights recursively
  const catHeight = (catId: string): number => {
    const cat = state.categories[catId];
    if (!cat) return 1;
    if (cat.collapsed) return 1; // collapsed: header only
    // recursively resolve child layout to find totalRows
    const inner = resolveLayout(state, catId, slotCount, inner => catHeight(inner));
    // +1 for header row
    return Math.max(1, inner.totalRows) + 1;
  };

  const layout = useMemo(
    () => resolveLayout(state, parentId, slotCount, catHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, parentId, slotCount]
  );

  // Determine which cells are occupied to place "+" buttons in empty ones
  const isEdit = state.editMode;
  const occupied = useMemo(() => {
    const rows = layout.totalRows + (isEdit ? 1 : 0); // extra row in edit
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

  // Drag & drop
  const onDragStartItem = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/hp-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };
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
  const onDropCell = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/hp-id');
    if (!id) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    // move to this parent, then set explicit layout at (col,row) if item
    const it = state.items[id];
    const ct = state.categories[id];
    const order = state.childOrder[parentId] || [];
    dispatch({ type: 'MOVE_CHILD', id, toParentId: parentId, toIndex: order.length });
    if (it) {
      const prev = it.layouts[slotCount];
      const w = prev?.w || 1;
      const h = prev?.h || 1;
      const cx = Math.max(0, Math.min(slotCount - w, cell.col));
      dispatch({
        type: 'SET_ITEM_LAYOUT',
        id,
        slotCount,
        sp: { x: cx, y: cell.row, w, h }
      });
    } else if (ct) {
      dispatch({ type: 'SET_CATEGORY_LAYOUT', id, slotCount, y: cell.row });
    }
  };

  // Resize handling
  const beginResize = (id: string, dir: 'r' | 'b' | 'br', startEv: React.MouseEvent) => {
    const item = state.items[id];
    if (!item || !gridRef.current) return;
    const cur = layout.items[id] || { x: 0, y: 0, w: 1, h: 1 };
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / slotCount;
    const cellH = rect.height / Math.max(1, totalRows);
    const startX = startEv.clientX;
    const startY = startEv.clientY;
    const startW = cur.w;
    const startH = cur.h;
    const move = (ev: MouseEvent) => {
      const dxCells = Math.round((ev.clientX - startX) / cellW);
      const dyCells = Math.round((ev.clientY - startY) / cellH);
      let newW = startW;
      let newH = startH;
      if (dir === 'r' || dir === 'br') newW = Math.max(1, Math.min(slotCount - cur.x, startW + dxCells));
      if (dir === 'b' || dir === 'br') newH = Math.max(1, startH + dyCells);
      dispatch({
        type: 'SET_ITEM_LAYOUT',
        id,
        slotCount,
        sp: { x: cur.x, y: cur.y, w: newW, h: newH }
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
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
      // If any descendant matches, show
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
      onDragOver={e => {
        if (isEdit) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={isEdit ? onDropCell : undefined}
    >
      {/* Items */}
      {Object.entries(layout.items).map(([id, sp]) => {
        const item = state.items[id];
        if (!item) return null;
        if (!matchesSearch(id)) return null;
        return (
          <ItemView
            key={id}
            item={item}
            editMode={isEdit}
            resizeMode={resizingItemId === id}
            onEdit={() => setEditItemId(id)}
            onStartResize={() => setResizingItemId(id)}
            onConfirmResize={() => setResizingItemId(null)}
            onDragStart={e => onDragStartItem(e, id)}
            onResizeHandle={(dir, ev) => beginResize(id, dir, ev)}
            style={{
              gridColumn: `${sp.x + 1} / span ${sp.w}`,
              gridRow: `${sp.y + 1} / span ${sp.h}`
            }}
          />
        );
      })}

      {/* Categories */}
      {Object.entries(layout.categories).map(([id, cr]) => {
        const cat = state.categories[id];
        if (!cat) return null;
        if (!matchesSearch(id)) return null;
        return (
          <div
            key={id}
            className={'category depth-' + depth + (cat.collapsed ? ' collapsed' : '')}
            style={{
              gridColumn: `1 / span ${slotCount}`,
              gridRow: `${cr.y + 1} / span ${cr.h}`,
              background: cat.color + (cat.color.length === 7 ? 'e6' : ''), // ~90% alpha
              borderColor: cat.color
            }}
            draggable={isEdit}
            onDragStart={e => {
              e.stopPropagation();
              onDragStartItem(e, id);
            }}
          >
            <div
              className="category-header"
              style={{ background: cat.color }}
              onClick={() => {
                if (!isEdit) {
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
              {isEdit && (
                <div className="category-actions">
                  <button
                    className="icon-btn"
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

      {/* "+" buttons in empty cells in edit mode */}
      {isEdit &&
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
