import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { nanoid } from 'nanoid';
import { AppState, Item, ItemType, emptyState, SizePos } from './types';

const STORAGE_KEY = 'helperpage.state.v1';

type Action =
  | { type: 'LOAD'; state: AppState }
  | { type: 'TOGGLE_EDIT' }
  | { type: 'TOGGLE_DARK' }
  | { type: 'ADD_ITEM'; itemType: ItemType; slotCount: number; position: { x: number; y: number }; size: { w: number; h: number } }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'UPDATE_ITEM_DATA'; id: string; data: any }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SET_ITEM_LAYOUT'; id: string; slotCount: number; sp: SizePos }
  | { type: 'MOVE_CHILD'; id: string; toIndex: number }
  | { type: 'IMPORT'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
    case 'IMPORT':
      return { ...action.state, editMode: false };
    case 'TOGGLE_EDIT':
      return { ...state, editMode: !state.editMode };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'ADD_ITEM': {
      const id = 'i_' + nanoid(8);
      const item: Item = {
        id,
        type: action.itemType,
        parentId: 'root',
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
          root: [...(state.childOrder.root || []), id]
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
      const newOrder = { ...state.childOrder };
      newOrder.root = (newOrder.root || []).filter(c => c !== action.id);
      return { ...state, items: newItems, childOrder: newOrder };
    }
    case 'SET_ITEM_LAYOUT': {
      const it = state.items[action.id];
      if (!it) return state;
      const newLayouts = { ...it.layouts, [action.slotCount]: action.sp };
      const parentOrder = state.childOrder.root || [];
      const promoted = [action.id, ...parentOrder.filter(c => c !== action.id)];
      return {
        ...state,
        items: { ...state.items, [action.id]: { ...it, layouts: newLayouts } },
        childOrder: { ...state.childOrder, root: promoted }
      };
    }
    case 'MOVE_CHILD': {
      const id = action.id;
      if (!state.items[id]) return state;
      const newOrder = { ...state.childOrder };
      newOrder.root = (newOrder.root || []).filter(c => c !== id);
      const toList = [...newOrder.root];
      const idx = Math.max(0, Math.min(toList.length, action.toIndex));
      toList.splice(idx, 0, id);
      newOrder.root = toList;
      return { ...state, childOrder: newOrder };
    }
    default:
      return state;
  }
}

function defaultData(t: ItemType): any {
  if (t === 'button') {
    return { text: 'Link', url: 'https://example.com', bgLight: '#4a90e2', bgDark: '#2b5f99' };
  }
  if (t === 'todo') {
    return { title: 'To-do', entries: [], bgLight: '#ffffff', bgDark: '#1f2430' };
  }
  return { title: 'Notes', markdown: '# Notes\n\nWrite here...', bgLight: '#ffffff', bgDark: '#1f2430' };
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
        // Migrate: drop legacy category data
        const { categories, ...rest } = parsed as any;
        return { ...emptyState(), ...rest, editMode: false } as AppState;
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
