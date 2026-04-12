export type ItemType = 'button' | 'todo' | 'notes';

export interface ButtonData {
  text: string;
  url: string;
  bg?: string; // legacy single-color (pre per-mode)
  bgLight?: string;
  bgDark?: string;
}
export interface TodoEntry {
  id: string;
  text: string;
  done: boolean;
}
export interface TodoData {
  title: string;
  entries: TodoEntry[];
  bgLight?: string;
  bgDark?: string;
}
export interface NotesData {
  title: string;
  markdown: string;
  bgLight?: string;
  bgDark?: string;
}

export type ItemData = ButtonData | TodoData | NotesData;

export interface SizePos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Item {
  id: string;
  type: ItemType;
  parentId: string; // "root" or category id
  data: ItemData;
  // per slot count (1..10): explicit size/pos; null/missing => use default packing
  layouts: Record<number, SizePos | null>;
}

export interface Category {
  id: string;
  parentId: string | null; // null => root
  name: string;
  color: string; // hex/rgba for header
  collapsed: boolean;
  // per slot count, explicit y ordering override. null/missing => packed default (follow childOrder)
  layouts: Record<number, { y: number } | null>;
}

export interface AppState {
  categories: Record<string, Category>;
  items: Record<string, Item>;
  childOrder: Record<string, string[]>; // parentId -> ordered child ids (mixed items+categories)
  darkMode: boolean;
  editMode: boolean;
  version: 1;
}

export const emptyState = (): AppState => ({
  categories: {},
  items: {},
  childOrder: { root: [] },
  darkMode: false,
  editMode: false,
  version: 1
});
