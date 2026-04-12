import { useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { UIProvider, useUI } from './uiContext';
import { BurgerMenu } from './components/BurgerMenu';
import { Container } from './components/Container';
import { slotsForWidth } from './layout';

function AppShell() {
  const { state, dispatch } = useStore();
  const ui = useUI();
  const [query, setQuery] = useState('');
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [slotCount, setSlotCount] = useState(4);

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

  // Exit resize mode whenever edit mode is turned off
  useEffect(() => {
    if (!state.editMode && ui.resizeMode) ui.setResizeMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editMode]);

  return (
    <div className={'page' + (ui.resizeMode ? ' resize-active' : '')}>
      <div className="top-bar">
        <BurgerMenu />
        <input
          className="search"
          type="text"
          placeholder="Search items, categories, notes…"
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
      <div className="board-wrap">
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
