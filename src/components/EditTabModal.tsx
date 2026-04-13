import { useState } from 'react';
import { useStore } from '../store';
import { Tab } from '../types';
import { Modal } from './Modal';
import { ColorPicker } from './ColorPicker';
import { resolveBg } from '../colors';

export function EditTabModal({
  tab,
  onClose
}: {
  tab: Tab;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (patch: Partial<Tab>) =>
    dispatch({ type: 'UPDATE_TAB', id: tab.id, patch });

  const field = state.darkMode ? 'bgDark' : 'bgLight';
  const currentBg = resolveBg(tab as any, state.darkMode);
  const itemCount = (state.childOrder[tab.id] || []).length;
  const canDelete = state.tabs.length > 1;

  const handleDelete = () => {
    if (itemCount > 0 && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    dispatch({ type: 'DELETE_TAB', id: tab.id });
    onClose();
  };

  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <Modal title="Edit tab" onClose={onClose}>
      <label>
        Title
        <input
          type="text"
          value={tab.title}
          onChange={e => update({ title: e.target.value })}
          onFocus={selectAll}
        />
      </label>
      <div className="field-block">
        <div className="field-label">
          Background ({state.darkMode ? 'dark mode' : 'light mode'})
        </div>
        <ColorPicker
          value={currentBg}
          onChange={c => update({ [field]: c })}
        />
        <small className="muted">
          Each theme has its own colour memory. Switch mode to edit the other.
        </small>
      </div>
      <div className="modal-footer">
        {canDelete ? (
          <button className="danger" onClick={handleDelete}>
            {confirmDelete ? `Delete tab and ${itemCount} items?` : 'Delete tab'}
          </button>
        ) : (
          <button className="danger" disabled>Delete tab</button>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
