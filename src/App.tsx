import { useCallback, useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { UIProvider, useUI } from './uiContext';
import { BurgerMenu } from './components/BurgerMenu';
import { Container } from './components/Container';
import { slotsForWidth } from './layout';
import { resolveBg, textColorFor } from './colors';

const LONG_PRESS_MS = 500;

function AppShell() {
  const { state, dispatch } = useStore();
  const ui = useUI();
  const [query, setQuery] = useState('');
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [slotCount, setSlotCount] = useState(4);
  const longPressTimer = useRef<number | null>(null);
  const longPressTarget = useRef<'slot' | 'blank' | null>(null);
  const longPressSlot = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!boardRef.current) return;
      const w = boardRef.current.clientWidth;
      setSlotCount(slotsForWidth(w, 0));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.darkMode ? 'dark' : 'light';
  }, [state.darkMode]);

  useEffect(() => {
    if (!state.editMode && ui.resizeMode) ui.setResizeMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editMode]);

  // Long-press on board-wrap (blank area) or container-grid (slots)
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTarget.current = null;
    longPressSlot.current = null;
  }, []);

  const onBoardPointerDown = useCallback(
    (e: React.PointerEvent) => {
      clearLongPress();
      const target = e.target as HTMLElement;
      // Ignore if clicking inside an item or a button/input
      if (target.closest('.item') || target.closest('button') || target.closest('input') || target.closest('textarea')) return;
      const isSlot = target.closest('.container-grid') != null;
      longPressTarget.current = isSlot ? 'slot' : 'blank';
      // If on a slot, figure out the grid cell
      if (isSlot) {
        const grid = target.closest('.container-grid') as HTMLElement;
        if (grid) {
          const rect = grid.getBoundingClientRect();
          const col = Math.floor(((e.clientX - rect.left) / rect.width) * slotCount);
          const rowHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size')) || 40;
          const gap = parseFloat(getComputedStyle(grid).gap) || 4;
          const row = Math.floor((e.clientY - rect.top) / (rowHeight + gap));
          longPressSlot.current = { x: Math.max(0, col), y: Math.max(0, row) };
        }
      }
      longPressTimer.current = window.setTimeout(() => {
        const kind = longPressTarget.current;
        if (kind === 'blank') {
          dispatch({ type: 'TOGGLE_EDIT' });
        } else if (kind === 'slot') {
          if (state.editMode) {
            dispatch({ type: 'TOGGLE_EDIT' });
          } else {
            // Enter edit mode; Container will pick up the pending slot via a custom event
            const slot = longPressSlot.current;
            dispatch({ type: 'TOGGLE_EDIT' });
            if (slot) {
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('hp-longpress-slot', { detail: slot })
                );
              }, 50);
            }
          }
        }
        clearLongPress();
      }, LONG_PRESS_MS);
    },
    [clearLongPress, dispatch, state.editMode, slotCount]
  );

  const onBoardPointerUp = useCallback(() => clearLongPress(), [clearLongPress]);
  const onBoardPointerLeave = useCallback(() => clearLongPress(), [clearLongPress]);

  return (
    <div className={'page' + (ui.resizeMode ? ' resize-active' : '')}>
      <div className="top-bar">
        <BurgerMenu />
        <div className="tab-bar">
          {state.tabs.map(tab => {
            const isActive = tab.id === state.activeTab;
            const bg = resolveBg(tab as any, state.darkMode);
            const fg = textColorFor(bg);
            return (
              <button
                key={tab.id}
                className={'tab-btn' + (isActive ? ' active' : '')}
                style={isActive ? { background: bg, color: fg } : undefined}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', id: tab.id })}
                title={tab.title}
              >
                {tab.title}
              </button>
            );
          })}
        </div>
        <label className="theme-toggle" title={state.darkMode ? 'Switch to light' : 'Switch to dark'}>
          <span className="theme-icon">{state.darkMode ? '☾' : '☀'}</span>
          <input
            type="checkbox"
            checked={state.darkMode}
            onChange={() => dispatch({ type: 'TOGGLE_DARK' })}
          />
          <span className="toggle-track" />
        </label>
        <input
          className="search"
          type="text"
          placeholder="Search items"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="top-spacer" />
      </div>
      {state.editMode && ui.resizeMode && (
        <div className="new-cat-bar">
          <button className="exit-resize-btn" onClick={() => ui.setResizeMode(false)}>
            ✓ Exit resize mode
          </button>
        </div>
      )}
      <div
        className="board-wrap"
        onPointerDown={onBoardPointerDown}
        onPointerUp={onBoardPointerUp}
        onPointerLeave={onBoardPointerLeave}
      >
        <div
          className="board"
          ref={boardRef}
          style={{ ['--slot-count' as any]: slotCount }}
        >
          <Container slotCount={slotCount} searchQuery={query} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </StoreProvider>
  );
}
