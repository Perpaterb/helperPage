import { AppState } from './types';
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
  const newItem = {
    ...item,
    layouts: {
      ...item.layouts,
      [slotCount]: { x: preview.x, y: preview.y, w: drag.w, h: drag.h }
    }
  };
  return {
    ...state,
    items: { ...state.items, [drag.itemId]: newItem },
    lastMovedItem: drag.itemId
  };
}
