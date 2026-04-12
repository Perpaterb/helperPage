import { createContext, useContext, useState, ReactNode } from 'react';

export interface DragInfo {
  itemId: string;
  fromParentId: string;
  offsetCol: number;
  offsetRow: number;
  w: number;
  h: number;
}

export interface DragPreview {
  parentId: string;
  x: number;
  y: number;
}

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface UIContextValue {
  resizeMode: boolean;
  setResizeMode: (v: boolean) => void;
  drag: DragInfo | null;
  setDrag: (d: DragInfo | null) => void;
  preview: DragPreview | null;
  setPreview: (p: DragPreview | null) => void;
  activeResize: { itemId: string; corner: Corner } | null;
  setActiveResize: (a: { itemId: string; corner: Corner } | null) => void;
}

const Ctx = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [resizeMode, setResizeMode] = useState(false);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [activeResize, setActiveResize] = useState<{ itemId: string; corner: Corner } | null>(null);
  return (
    <Ctx.Provider
      value={{
        resizeMode,
        setResizeMode,
        drag,
        setDrag,
        preview,
        setPreview,
        activeResize,
        setActiveResize
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI must be used inside UIProvider');
  return v;
}
