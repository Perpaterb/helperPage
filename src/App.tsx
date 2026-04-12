import { useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { BurgerMenu } from './components/BurgerMenu';
import { Container } from './components/Container';
import { slotsForWidth } from './layout';

function AppShell() {
  const { state, dispatch } = useStore();
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

  return (
    <div className="page">
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
      {state.editMode && (
        <div className="new-cat-bar">
          <button className="new-cat-btn" onClick={() => dispatch({ type: 'ADD_CATEGORY' })}>
            + New category
          </button>
          <span className="slot-info">Slot width: {slotCount}</span>
        </div>
      )}
      <div className="board-wrap">
        <div
          className="board"
          ref={boardRef}
          style={{ ['--slot-count' as any]: slotCount }}
        >
          <Container parentId="root" slotCount={slotCount} depth={0} searchQuery={query} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
