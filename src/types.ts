export type ItemType = 'button' | 'todo' | 'notes' | 'folder' | 'sketch';

export interface ButtonData {
  text: string;
  url: string;
  bg?: string;
  bgLight?: string;
  bgDark?: string;
  showFavicon?: boolean;
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

export interface FolderData {
  title: string;
  bgLight?: string;
  bgDark?: string;
}

export interface SketchStroke {
  color: string;
  width: number;
  points: number[]; // flattened [x0, y0, x1, y1, ...] in 0-1000 normalized space
}

export interface SketchData {
  title?: string;
  bgLight?: string;
  bgDark?: string;
  strokes: SketchStroke[];
  penColor?: string;
  penSize?: number;
}

export type ItemData = ButtonData | TodoData | NotesData | FolderData | SketchData;

export interface SizePos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Item {
  id: string;
  type: ItemType;
  parentId: string; // tab id
  data: ItemData;
  layouts: Record<number, SizePos | null>;
}

export interface Tab {
  id: string;
  title: string;
  bgLight?: string;
  bgDark?: string;
}

export interface AppState {
  items: Record<string, Item>;
  childOrder: Record<string, string[]>;
  tabs: Tab[];
  activeTab: string;
  darkMode: boolean;
  editMode: boolean;
  lastMovedItem?: string;
  version: 1;
}

export const DEFAULT_TAB_ID = 'tab_default';

export const emptyState = (): AppState => ({
  items: {},
  childOrder: { [DEFAULT_TAB_ID]: [] },
  tabs: [{ id: DEFAULT_TAB_ID, title: 'Home' }],
  activeTab: DEFAULT_TAB_ID,
  darkMode: false,
  editMode: false,
  version: 1
});
