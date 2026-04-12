import { Modal } from './Modal';
import { ItemType } from '../types';

export function AddItemModal({
  onPick,
  onClose
}: {
  onPick: (t: ItemType) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Add item" onClose={onClose}>
      <div className="add-item-grid">
        <button className="add-item-btn" onClick={() => onPick('button')}>
          <div className="add-item-icon">🔗</div>
          Button
          <small>Link to a URL</small>
        </button>
        <button className="add-item-btn" onClick={() => onPick('todo')}>
          <div className="add-item-icon">☑</div>
          To-do
          <small>Checklist</small>
        </button>
        <button className="add-item-btn" onClick={() => onPick('notes')}>
          <div className="add-item-icon">📝</div>
          Notes
          <small>Markdown editor</small>
        </button>
      </div>
    </Modal>
  );
}
