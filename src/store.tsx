import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { nanoid } from 'nanoid';
import { AppState, Category, Item, ItemType, emptyState, SizePos } from './types';

const STORAGE_KEY = 'helperpage.state.v1';

type Action =
  | { type: 'LOAD'; state: AppState }
  | { type: 'TOGGLE_EDIT' }
  | { type: 'TOGGLE_DARK' }
  | { type: 'ADD_CATEGORY' }
  | { type: 'UPDATE_CATEGORY'; id: string; patch: Partial<Category> }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'ADD_ITEM'; parentId: string; itemType: ItemType; slotCount: number; position: { x: number; y: number } }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'UPDATE_ITEM_DATA'; id: string; data: any }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SET_ITEM_LAYOUT'; id: string; slotCount: number; sp: SizePos }
  | { type: 'SET_CATEGORY_LAYOUT'; id: string; slotCount: number; y: number | null }
  | { type: 'RESET_LAYOUTS'; parentId: string; slotCount: number }
  | { type: 'MOVE_CHILD'; id: string; toParentId: string; toIndex: number }
  | { type: 'IMPORT'; state: AppState };

const defaultColor = '#c8c8c8';

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
    case 'IMPORT':
      return { ...action.state, editMode: false };
    case 'TOGGLE_EDIT':
      return { ...state, editMode: !state.editMode };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'ADD_CATEGORY': {
      const id = 'c_' + nanoid(8);
      const cat: Category = {
        id,
        parentId: null,
        name: 'New Category',
        color: defaultColor,
        collapsed: false,
        layouts: {}
      };
      return {
        ...state,
        categories: { ...state.categories, [id]: cat },
        childOrder: { ...state.childOrder, root: [id, ...(state.childOrder.root || [])], [id]: [] }
      };
    }
    case 'UPDATE_CATEGORY': {
      const cat = state.categories[action.id];
      if (!cat) return state;
      return { ...state, categories: { ...state.categories, [action.id]: { ...cat, ...action.patch } } };
    }
    case 'DELETE_CATEGORY': {
      const cat = state.categories[action.id];
      if (!cat) return state;
      const children = state.childOrder[action.id] || [];
      if (children.length) return state; // safety: not allowed
      const parent = cat.parentId || 'root';
      const newCats = { ...state.categories };
      delete newCats[action.id];
      const newOrder = { ...state.childOrder };
      newOrder[parent] = (newOrder[parent] || []).filter(c => c !== action.id);
      delete newOrder[action.id];
      return { ...state, categories: newCats, childOrder: newOrder };
    }
    case 'ADD_ITEM': {
      const id = 'i_' + nanoid(8);
      const item: Item = {
        id,
        type: action.itemType,
        parentId: action.parentId,
        data: defaultData(action.itemType),
        layouts: { [action.slotCount]: { x: action.position.x, y: action.position.y, w: 1, h: 1 } }
      };
      return {
        ...state,
        items: { ...state.items, [id]: item },
        childOrder: {
          ...state.childOrder,
          [action.parentId]: [...(state.childOrder[action.parentId] || []), id]
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
      const parent = it.parentId;
      const newOrder = { ...state.childOrder };
      newOrder[parent] = (newOrder[parent] || []).filter(c => c !== action.id);
      return { ...state, items: newItems, childOrder: newOrder };
    }
    case 'SET_ITEM_LAYOUT': {
      const it = state.items[action.id];
      if (!it) return state;
      const newLayouts = { ...it.layouts, [action.slotCount]: action.sp };
      // Promote this item to the front of its parent's child order so the
      // packer honours its position over earlier-added items on collision.
      const parent = it.parentId;
      const parentOrder = state.childOrder[parent] || [];
      const promoted = [action.id, ...parentOrder.filter(c => c !== action.id)];
      return {
        ...state,
        items: { ...state.items, [action.id]: { ...it, layouts: newLayouts } },
        childOrder: { ...state.childOrder, [parent]: promoted }
      };
    }
    case 'SET_CATEGORY_LAYOUT': {
      const cat = state.categories[action.id];
      if (!cat) return state;
      const newLayouts = { ...cat.layouts, [action.slotCount]: action.y == null ? null : { y: action.y } };
      return { ...state, categories: { ...state.categories, [action.id]: { ...cat, layouts: newLayouts } } };
    }
    case 'RESET_LAYOUTS': {
      // Clear overrides for all items/cats inside parentId for given slotCount
      const ids = state.childOrder[action.parentId] || [];
      const newItems = { ...state.items };
      const newCats = { ...state.categories };
      for (const cid of ids) {
        if (newItems[cid]) {
          const L = { ...newItems[cid].layouts };
          delete L[action.slotCount];
          newItems[cid] = { ...newItems[cid], layouts: L };
        } else if (newCats[cid]) {
          const L = { ...newCats[cid].layouts };
          delete L[action.slotCount];
          newCats[cid] = { ...newCats[cid], layouts: L };
        }
      }
      return { ...state, items: newItems, categories: newCats };
    }
    case 'MOVE_CHILD': {
      const id = action.id;
      const isItem = !!state.items[id];
      const isCat = !!state.categories[id];
      if (!isItem && !isCat) return state;
      // prevent moving cat into itself / descendant
      if (isCat && isDescendant(state, id, action.toParentId)) return state;
      const fromParent = isItem ? state.items[id].parentId : (state.categories[id].parentId || 'root');
      const newOrder = { ...state.childOrder };
      newOrder[fromParent] = (newOrder[fromParent] || []).filter(c => c !== id);
      const toList = [...(newOrder[action.toParentId] || [])];
      const idx = Math.max(0, Math.min(toList.length, action.toIndex));
      toList.splice(idx, 0, id);
      newOrder[action.toParentId] = toList;
      let newItems = state.items;
      let newCats = state.categories;
      if (isItem) {
        newItems = { ...state.items, [id]: { ...state.items[id], parentId: action.toParentId } };
      } else {
        newCats = {
          ...state.categories,
          [id]: { ...state.categories[id], parentId: action.toParentId === 'root' ? null : action.toParentId }
        };
      }
      return { ...state, items: newItems, categories: newCats, childOrder: newOrder };
    }
    default:
      return state;
  }
}

function isDescendant(state: AppState, ancestorId: string, candidateId: string): boolean {
  if (ancestorId === candidateId) return true;
  const kids = state.childOrder[ancestorId] || [];
  for (const k of kids) {
    if (state.categories[k] && isDescendant(state, k, candidateId)) return true;
  }
  return false;
}

function defaultData(t: ItemType): any {
  if (t === 'button') return { text: 'Link', url: 'https://example.com', bg: '#4a90e2' };
  if (t === 'todo') return { title: 'To-do', entries: [] };
  return { title: 'Notes', markdown: '# Notes\n\nWrite here...' };
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
        return { ...emptyState(), ...parsed, editMode: false } as AppState;
      }
    } catch {}
    return emptyState();
  });

  useEffect(() => {
    try {
      const { editMode, ...persist } = state;
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
