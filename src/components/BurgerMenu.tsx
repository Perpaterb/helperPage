import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useStore, migrateState } from '../store';
import { Tab } from '../types';
import { EditTabModal } from './EditTabModal';
import { resolveBg, textColorFor } from '../colors';

export function BurgerMenu() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [editTab, setEditTab] = useState<Tab | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const doExport = () => {
    const { editMode, ...rest } = state;
    const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `helperpage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const doImport = () => {
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const merged = migrateState(parsed);
      dispatch({ type: 'IMPORT', state: merged });
    } catch (err) {
      alert('Invalid JSON file');
    }
    e.target.value = '';
    setOpen(false);
  };

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    const from = dragIdx.current;
    if (from == null || from === idx) {
      dragIdx.current = null;
      setDragOverIdx(null);
      return;
    }
    const newTabs = [...state.tabs];
    const [moved] = newTabs.splice(from, 1);
    newTabs.splice(idx, 0, moved);
    dispatch({ type: 'REORDER_TABS', tabs: newTabs });
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  return (
    <>
      <button className="burger-btn" onClick={() => setOpen(!open)} title="Menu">
        ☰
      </button>
      {open && (
        <div className="burger-menu" onMouseLeave={() => setOpen(false)}>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_EDIT' });
              setOpen(false);
            }}
          >
            {state.editMode ? '✓ Edit mode' : 'Edit mode'}
          </button>
          <button onClick={doImport}>Import JSON…</button>
          <button onClick={doExport}>Export JSON</button>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_DARK' });
              setOpen(false);
            }}
          >
            {state.darkMode ? '☀ Light mode' : '☾ Dark mode'}
          </button>

          <div className="burger-divider" />
          <div className="burger-section-label">Tabs</div>

          <div className="burger-tabs-list">
            {state.tabs.map((tab, idx) => {
              const bg = resolveBg(tab as any, state.darkMode);
              const fg = textColorFor(bg);
              const isActive = tab.id === state.activeTab;
              return (
                <div
                  key={tab.id}
                  className={
                    'burger-tab-row' +
                    (isActive ? ' active' : '') +
                    (dragOverIdx === idx ? ' drag-over' : '')
                  }
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                >
                  <button
                    className="burger-tab-select"
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_TAB', id: tab.id });
                      setOpen(false);
                    }}
                  >
                    <span
                      className="burger-tab-dot"
                      style={{ background: bg, color: fg }}
                    />
                    <span className="burger-tab-title">{tab.title}</span>
                  </button>
                  <button
                    className="burger-tab-edit"
                    onClick={() => setEditTab(tab)}
                    title="Edit tab"
                  >
                    ✎
                  </button>
                  <span className="burger-tab-grip" title="Drag to reorder">⠿</span>
                </div>
              );
            })}
          </div>

          <button
            className="burger-tab-add"
            onClick={() => {
              const newId = 'tab_' + nanoid(8);
              dispatch({ type: 'ADD_TAB', id: newId });
              setOpen(false);
              setEditTab({ id: newId, title: `Tab ${state.tabs.length + 1}` });
            }}
          >
            + New tab
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={onFile}
      />
      {editTab && (
        <EditTabModal
          tab={state.tabs.find(t => t.id === editTab.id) || editTab}
          onClose={() => setEditTab(null)}
        />
      )}
    </>
  );
}
