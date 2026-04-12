import { useStore } from '../store';
import { Modal } from './Modal';
import { ColorPicker } from './ColorPicker';

export function EditCategoryModal({
  catId,
  onClose,
  onDelete
}: {
  catId: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { state, dispatch } = useStore();
  const cat = state.categories[catId];
  if (!cat) return null;
  const children = state.childOrder[catId] || [];
  const canDelete = children.length === 0;
  return (
    <Modal title="Edit category" onClose={onClose}>
      <label>
        Name
        <input
          type="text"
          value={cat.name}
          onChange={e =>
            dispatch({ type: 'UPDATE_CATEGORY', id: catId, patch: { name: e.target.value } })
          }
        />
      </label>
      <div className="field-block">
        <div className="field-label">Background colour</div>
        <ColorPicker
          value={cat.color}
          onChange={c =>
            dispatch({ type: 'UPDATE_CATEGORY', id: catId, patch: { color: c } })
          }
        />
      </div>
      <div className="modal-footer">
        <button className="danger" disabled={!canDelete} onClick={onDelete}>
          {canDelete ? 'Delete' : 'Delete (empty first)'}
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
