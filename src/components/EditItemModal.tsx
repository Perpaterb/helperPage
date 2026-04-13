import { useStore } from '../store';
import { Modal } from './Modal';
import { ButtonData, NotesData, TodoData } from '../types';
import { resolveBg } from '../colors';
import { ColorPicker } from './ColorPicker';

export function EditItemModal({
  itemId,
  onClose,
  onDelete
}: {
  itemId: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { state, dispatch } = useStore();
  const item = state.items[itemId];
  if (!item) return null;

  const update = (data: any) =>
    dispatch({ type: 'UPDATE_ITEM_DATA', id: itemId, data: { ...item.data, ...data } });

  const field = state.darkMode ? 'bgDark' : 'bgLight';
  const currentBg = resolveBg(item.data as any, state.darkMode);

  const ColorField = () => (
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
  );

  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <Modal title={`Edit ${item.type}`} onClose={onClose}>
      {item.type === 'button' && (
        <>
          <label>
            Text
            <input
              type="text"
              value={(item.data as ButtonData).text}
              onChange={e => update({ text: e.target.value })}
              onFocus={selectAll}
            />
          </label>
          <label>
            URL
            <input
              type="text"
              value={(item.data as ButtonData).url}
              onChange={e => update({ url: e.target.value })}
              onFocus={selectAll}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={(item.data as ButtonData).showFavicon !== false}
              onChange={e => update({ showFavicon: e.target.checked })}
            />
            Show favicon
          </label>
          <ColorField />
        </>
      )}
      {item.type === 'todo' && (
        <>
          <label>
            Title
            <input
              type="text"
              value={(item.data as TodoData).title}
              onChange={e => update({ title: e.target.value })}
              onFocus={selectAll}
            />
          </label>
          <ColorField />
        </>
      )}
      {item.type === 'notes' && (
        <>
          <label>
            Title
            <input
              type="text"
              value={(item.data as NotesData).title}
              onChange={e => update({ title: e.target.value })}
              onFocus={selectAll}
            />
          </label>
          <label>
            Markdown
            <textarea
              rows={10}
              value={(item.data as NotesData).markdown}
              onChange={e => update({ markdown: e.target.value })}
            />
          </label>
          <ColorField />
        </>
      )}
      <div className="modal-footer">
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
