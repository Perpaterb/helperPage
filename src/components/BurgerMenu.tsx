import { useRef, useState } from 'react';
import { useStore } from '../store';
import { AppState, emptyState } from '../types';

export function BurgerMenu() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const merged: AppState = { ...emptyState(), ...parsed, editMode: false };
      dispatch({ type: 'IMPORT', state: merged });
    } catch (err) {
      alert('Invalid JSON file');
    }
    e.target.value = '';
    setOpen(false);
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
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={onFile}
      />
    </>
  );
}
