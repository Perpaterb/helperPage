import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { nanoid } from 'nanoid';
import { AppState, Item, ItemType, Tab, emptyState, SizePos, DEFAULT_TAB_ID } from './types';

const STORAGE_KEY = 'helperpage.state.v1';

type Action =
  | { type: 'LOAD'; state: AppState }
  | { type: 'TOGGLE_EDIT' }
  | { type: 'TOGGLE_DARK' }
  | { type: 'ADD_ITEM'; id: string; itemType: ItemType; slotCount: number; position: { x: number; y: number }; size: { w: number; h: number } }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'UPDATE_ITEM_DATA'; id: string; data: any }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SET_ITEM_LAYOUT'; id: string; slotCount: number; sp: SizePos }
  | { type: 'MOVE_CHILD'; id: string; toIndex: number }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'ADD_TAB'; id: string }
  | { type: 'DELETE_TAB'; id: string }
  | { type: 'UPDATE_TAB'; id: string; patch: Partial<Tab> }
  | { type: 'SET_ACTIVE_TAB'; id: string }
  | { type: 'REORDER_TABS'; tabs: Tab[] }
  | { type: 'MOVE_ITEM_TO_TAB'; id: string; toTab: string; slotCount: number }
  | { type: 'MOVE_FOLDER_WITH_CHILDREN'; folderId: string; slotCount: number; dx: number; dy: number; childIds: string[] };

function reducer(state: AppState, action: Action): AppState {
  const tab = state.activeTab;
  switch (action.type) {
    case 'LOAD':
    case 'IMPORT':
      return { ...action.state, editMode: false };
    case 'TOGGLE_EDIT':
      return { ...state, editMode: !state.editMode };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'ADD_ITEM': {
      const id = action.id;
      const item: Item = {
        id,
        type: action.itemType,
        parentId: tab,
        data: defaultData(action.itemType),
        layouts: {
          [action.slotCount]: {
            x: action.position.x,
            y: action.position.y,
            w: action.size.w,
            h: action.size.h
          }
        }
      };
      return {
        ...state,
        items: { ...state.items, [id]: item },
        childOrder: {
          ...state.childOrder,
          [tab]: [...(state.childOrder[tab] || []), id]
        }
      };
    }
    case 'UPDATE_ITEM': {
      const it = state.items[action.id];
      if (!it) return state;
      return { ...state, items: { ...state.items, [action.id]: { ...it, ...action.patch } } };
    }
    case 'UPDATE_ITEM_DATA': {
      const it = state.items[action.id];
      if (!it) return state;
      return { ...state, items: { ...state.items, [action.id]: { ...it, data: action.data } } };
    }
    case 'DELETE_ITEM': {
      const it = state.items[action.id];
      if (!it) return state;
      const newItems = { ...state.items };
      delete newItems[action.id];
      const parentKey = it.parentId;
      const newOrder = { ...state.childOrder };
      newOrder[parentKey] = (newOrder[parentKey] || []).filter(c => c !== action.id);
      return { ...state, items: newItems, childOrder: newOrder };
    }
    case 'SET_ITEM_LAYOUT': {
      const it = state.items[action.id];
      if (!it) return state;
      const newLayouts = { ...it.layouts, [action.slotCount]: action.sp };
      return {
        ...state,
        items: { ...state.items, [action.id]: { ...it, layouts: newLayouts } },
        lastMovedItem: action.id
      };
    }
    case 'MOVE_CHILD': {
      const id = action.id;
      if (!state.items[id]) return state;
      const newOrder = { ...state.childOrder };
      newOrder[tab] = (newOrder[tab] || []).filter(c => c !== id);
      const toList = [...newOrder[tab]];
      const idx = Math.max(0, Math.min(toList.length, action.toIndex));
      toList.splice(idx, 0, id);
      newOrder[tab] = toList;
      return { ...state, childOrder: newOrder };
    }
    // --- Tab actions ---
    case 'ADD_TAB': {
      const id = action.id;
      const newTab: Tab = { id, title: `Tab ${state.tabs.length + 1}` };
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        childOrder: { ...state.childOrder, [id]: [] },
        activeTab: id
      };
    }
    case 'DELETE_TAB': {
      if (state.tabs.length <= 1) return state; // always keep at least one
      const delId = action.id;
      const newTabs = state.tabs.filter(t => t.id !== delId);
      // Remove items belonging to this tab
      const newItems = { ...state.items };
      const tabItems = state.childOrder[delId] || [];
      for (const itemId of tabItems) delete newItems[itemId];
      const newOrder = { ...state.childOrder };
      delete newOrder[delId];
      // Switch active tab if needed
      const newActive = state.activeTab === delId ? newTabs[0].id : state.activeTab;
      return {
        ...state,
        tabs: newTabs,
        items: newItems,
        childOrder: newOrder,
        activeTab: newActive
      };
    }
    case 'UPDATE_TAB': {
      return {
        ...state,
        tabs: state.tabs.map(t => t.id === action.id ? { ...t, ...action.patch } : t)
      };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.id };
    case 'REORDER_TABS':
      return { ...state, tabs: action.tabs };
    case 'MOVE_ITEM_TO_TAB': {
      const it = state.items[action.id];
      if (!it) return state;
      const fromTab = it.parentId;
      const toTab = action.toTab;
      if (fromTab === toTab) return state;
      const sc = action.slotCount;

      // Get the item's layout at this slot count (or pick from any)
      const sizes = Object.values(it.layouts).filter(Boolean) as SizePos[];
      const lay = it.layouts[sc] || sizes[sizes.length - 1] || { x: 0, y: 0, w: 2, h: 2 };
      const w = Math.max(1, Math.min(lay.w, sc));
      const h = Math.max(1, lay.h);
      let targetX = Math.max(0, Math.min(lay.x, sc - w));
      let targetY = Math.max(0, lay.y);

      // Build occupied grid for the target tab
      const targetOrder = state.childOrder[toTab] || [];
      const occupied: boolean[][] = [];
      const ensureRow = (r: number) => {
        while (occupied.length <= r) occupied.push(new Array(sc).fill(false));
      };
      const isFree = (x: number, y: number, cw: number, ch: number) => {
        for (let rr = y; rr < y + ch; rr++) {
          for (let cc = x; cc < x + cw; cc++) {
            if (cc >= sc) return false;
            ensureRow(rr);
            if (occupied[rr][cc]) return false;
          }
        }
        return true;
      };
      for (const cid of targetOrder) {
        const other = state.items[cid];
        if (!other) continue;
        const oLay = other.layouts[sc];
        if (!oLay) continue;
        for (let rr = oLay.y; rr < oLay.y + oLay.h; rr++) {
          for (let cc = oLay.x; cc < oLay.x + oLay.w; cc++) {
            ensureRow(rr);
            if (cc < sc) occupied[rr][cc] = true;
          }
        }
      }

      // Try preferred position, otherwise find first free spot
      ensureRow(targetY + h - 1);
      if (!isFree(targetX, targetY, w, h)) {
        let placed = false;
        for (let r = 0; r < 500 && !placed; r++) {
          ensureRow(r);
          for (let c = 0; c + w <= sc; c++) {
            if (isFree(c, r, w, h)) {
              targetX = c;
              targetY = r;
              placed = true;
              break;
            }
          }
        }
      }

      const dx = targetX - lay.x;
      const dy = targetY - lay.y;

      // Find children if moving a folder (based on current positions)
      const childrenToMove: string[] = [];
      if (it.type === 'folder') {
        const fBodyTop = lay.y + 1;
        const fBodyBottom = lay.y + h;
        const fLeft = lay.x;
        const fRight = lay.x + w;
        for (const cid of state.childOrder[fromTab] || []) {
          if (cid === action.id) continue;
          const other = state.items[cid];
          if (!other || other.type === 'folder') continue;
          const oLay = other.layouts[sc];
          if (!oLay) continue;
          if (
            oLay.x >= fLeft &&
            oLay.x + oLay.w <= fRight &&
            oLay.y >= fBodyTop &&
            oLay.y + oLay.h <= fBodyBottom
          ) {
            childrenToMove.push(cid);
          }
        }
      }

      // Update item: new parent, set layout at this slot count
      const newItems = { ...state.items };
      newItems[action.id] = {
        ...it,
        parentId: toTab,
        layouts: { ...it.layouts, [sc]: { x: targetX, y: targetY, w, h } }
      };
      // Move children along with folder
      for (const cid of childrenToMove) {
        const ch = state.items[cid];
        if (!ch) continue;
        const cLay = ch.layouts[sc];
        if (!cLay) continue;
        newItems[cid] = {
          ...ch,
          parentId: toTab,
          layouts: {
            ...ch.layouts,
            [sc]: { ...cLay, x: Math.max(0, cLay.x + dx), y: Math.max(0, cLay.y + dy) }
          }
        };
      }

      // Update childOrder: remove moved items from source, add to target
      const movedIds = [action.id, ...childrenToMove];
      const newOrder = { ...state.childOrder };
      newOrder[fromTab] = (newOrder[fromTab] || []).filter(c => !movedIds.includes(c));
      newOrder[toTab] = [...(newOrder[toTab] || []), ...movedIds];

      return {
        ...state,
        items: newItems,
        childOrder: newOrder
      };
    }
    case 'MOVE_FOLDER_WITH_CHILDREN': {
      const folder = state.items[action.folderId];
      if (!folder) return state;
      const sc = action.slotCount;
      const newItems = { ...state.items };
      // Update folder
      const fLay = folder.layouts[sc];
      if (fLay) {
        newItems[action.folderId] = {
          ...folder,
          layouts: {
            ...folder.layouts,
            [sc]: { ...fLay, x: Math.max(0, fLay.x + action.dx), y: Math.max(0, fLay.y + action.dy) }
          }
        };
      }
      // Update children
      for (const cid of action.childIds) {
        const ch = state.items[cid];
        if (!ch) continue;
        const cLay = ch.layouts[sc];
        if (!cLay) continue;
        newItems[cid] = {
          ...ch,
          layouts: {
            ...ch.layouts,
            [sc]: { ...cLay, x: Math.max(0, cLay.x + action.dx), y: Math.max(0, cLay.y + action.dy) }
          }
        };
      }
      return { ...state, items: newItems, lastMovedItem: action.folderId };
    }
    default:
      return state;
  }
}

function defaultData(t: ItemType): any {
  if (t === 'button') {
    return { text: 'Link', url: 'https://example.com', bgLight: '#4a90e2', bgDark: '#2b5f99', showFavicon: true };
  }
  if (t === 'todo') {
    return { title: 'To-do', entries: [], bgLight: '#ffffff', bgDark: '#1f2430' };
  }
  if (t === 'folder') {
    return { title: 'Folder', bgLight: '#c8e0ff', bgDark: '#2a3a55' };
  }
  if (t === 'sketch') {
    return { title: 'Sketch', strokes: [], bgLight: '#ffffff', bgDark: '#1f2430', penColor: '#000000', penSize: 3 };
  }
  return { title: 'Notes', markdown: '# Notes\n\nWrite here...', bgLight: '#ffffff', bgDark: '#1f2430' };
}

// Migrate old state that has no tabs
export function migrateState(parsed: any): AppState {
  const base = { ...emptyState(), ...parsed, editMode: false };
  // Drop legacy categories
  delete (base as any).categories;
  // If no tabs field, migrate root items to default tab
  if (!parsed.tabs) {
    base.tabs = [{ id: DEFAULT_TAB_ID, title: 'Home' }];
    base.activeTab = DEFAULT_TAB_ID;
    // Move childOrder.root to childOrder[DEFAULT_TAB_ID]
    if (base.childOrder.root) {
      base.childOrder[DEFAULT_TAB_ID] = base.childOrder.root;
      delete base.childOrder.root;
    }
    if (!base.childOrder[DEFAULT_TAB_ID]) {
      base.childOrder[DEFAULT_TAB_ID] = [];
    }
    // Update item parentIds
    for (const item of Object.values(base.items) as Item[]) {
      if (item.parentId === 'root') {
        item.parentId = DEFAULT_TAB_ID;
      }
    }
  }
  return base as AppState;
}

interface Ctx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return migrateState(parsed);
      }
    } catch {}
    return emptyState();
  });

  useEffect(() => {
    try {
      const { editMode, lastMovedItem, ...persist } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    } catch {}
  }, [state]);

  return <AppCtx.Provider value={{ state, dispatch }}>{children}</AppCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
