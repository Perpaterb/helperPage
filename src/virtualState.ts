import { AppState } from './types';
import { DragInfo, DragPreview } from './uiContext';

// Returns a state where the currently dragged item has been moved to the
// preview parent/position, so that resolveLayout will show live
// displacement as the user drags.
export function buildVirtualState(
  state: AppState,
  drag: DragInfo | null,
  preview: DragPreview | null,
  slotCount: number
): AppState {
  if (!drag || !preview) return state;
  const item = state.items[drag.itemId];
  if (!item) return state;
  const fromParent = item.parentId;
  const toParent = preview.parentId;
  const newItem = {
    ...item,
    parentId: toParent,
    layouts: {
      ...item.layouts,
      [slotCount]: { x: preview.x, y: preview.y, w: drag.w, h: drag.h }
    }
  };
  // Put the dragged item first in its parent's child order so the packer
  // honours its preview position before placing other explicit items.
  const newChildOrder = { ...state.childOrder };
  if (fromParent !== toParent) {
    newChildOrder[fromParent] = (newChildOrder[fromParent] || []).filter(
      c => c !== drag.itemId
    );
  }
  const toList = (newChildOrder[toParent] || []).filter(c => c !== drag.itemId);
  newChildOrder[toParent] = [drag.itemId, ...toList];
  return {
    ...state,
    items: { ...state.items, [drag.itemId]: newItem },
    childOrder: newChildOrder
  };
}
