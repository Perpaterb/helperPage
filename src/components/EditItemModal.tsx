import { useStore } from '../store';
import { Modal } from './Modal';
import { ButtonData, NotesData, TodoData } from '../types';

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
            />
          </label>
          <label>
            URL
            <input
              type="text"
              value={(item.data as ButtonData).url}
              onChange={e => update({ url: e.target.value })}
            />
          </label>
          <label>
            Background colour
            <input
              type="color"
              value={(item.data as ButtonData).bg}
              onChange={e => update({ bg: e.target.value })}
            />
          </label>
        </>
      )}
      {item.type === 'todo' && (
        <label>
          Title
          <input
            type="text"
            value={(item.data as TodoData).title}
            onChange={e => update({ title: e.target.value })}
          />
        </label>
      )}
      {item.type === 'notes' && (
        <>
          <label>
            Title
            <input
              type="text"
              value={(item.data as NotesData).title}
              onChange={e => update({ title: e.target.value })}
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
