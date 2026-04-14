import { AppState, SizePos } from './types';
import { DragInfo, DragPreview } from './uiContext';

export function buildVirtualState(
  state: AppState,
  drag: DragInfo | null,
  preview: DragPreview | null,
  slotCount: number
): AppState {
  if (!drag || !preview) return state;
  const item = state.items[drag.itemId];
  if (!item) return state;
  const currentLay = item.layouts[slotCount];
  const newItem = {
    ...item,
    layouts: {
      ...item.layouts,
      [slotCount]: { x: preview.x, y: preview.y, w: drag.w, h: drag.h }
    }
  };
  const newItems = { ...state.items, [drag.itemId]: newItem };

  // If folder, also move contained children by same delta
  if (item.type === 'folder' && currentLay && drag.childIds) {
    const dx = preview.x - currentLay.x;
    const dy = preview.y - currentLay.y;
    for (const cid of drag.childIds) {
      const ch = state.items[cid];
      if (!ch) continue;
      const cLay = ch.layouts[slotCount];
      if (!cLay) continue;
      newItems[cid] = {
        ...ch,
        layouts: {
          ...ch.layouts,
          [slotCount]: { ...cLay, x: Math.max(0, cLay.x + dx), y: Math.max(0, cLay.y + dy) } as SizePos
        }
      };
    }
  }

  return {
    ...state,
    items: newItems,
    lastMovedItem: drag.itemId
  };
}
