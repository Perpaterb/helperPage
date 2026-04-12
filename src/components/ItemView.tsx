import { ButtonItem } from '../items/ButtonItem';
import { TodoItem } from '../items/TodoItem';
import { NotesItem } from '../items/NotesItem';
import { Item, ButtonData, TodoData, NotesData } from '../types';
import { useStore } from '../store';

interface Props {
  item: Item;
  editMode: boolean;
  resizeMode: boolean;
  onEdit: () => void;
  onStartResize: () => void;
  onConfirmResize: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onResizeHandle: (dir: 'r' | 'b' | 'br', ev: React.MouseEvent) => void;
  hidden?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function ItemView({
  item,
  editMode,
  resizeMode,
  onEdit,
  onStartResize,
  onConfirmResize,
  onDragStart,
  onResizeHandle,
  hidden,
  style,
  className
}: Props) {
  const { dispatch } = useStore();

  let inner: React.ReactNode = null;
  if (item.type === 'button') {
    inner = <ButtonItem data={item.data as ButtonData} />;
  } else if (item.type === 'todo') {
    inner = (
      <TodoItem
        data={item.data as TodoData}
        onChange={d => dispatch({ type: 'UPDATE_ITEM_DATA', id: item.id, data: d })}
      />
    );
  } else if (item.type === 'notes') {
    inner = (
      <NotesItem
        data={item.data as NotesData}
        onChange={d => dispatch({ type: 'UPDATE_ITEM_DATA', id: item.id, data: d })}
      />
    );
  }

  return (
    <div
      className={
        'item ' +
        ('type-' + item.type) +
        (editMode ? ' edit' : '') +
        (resizeMode ? ' resize' : '') +
        (hidden ? ' hidden' : '') +
        (className ? ' ' + className : '')
      }
      style={style}
      draggable={editMode && !resizeMode}
      onDragStart={onDragStart}
      data-item-id={item.id}
    >
      {inner}
      {editMode && !resizeMode && (
        <div className="item-actions">
          <button
            className="icon-btn"
            title="Edit"
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
          >
            ✎
          </button>
          <button
            className="icon-btn"
            title="Resize"
            onClick={e => {
              e.stopPropagation();
              onStartResize();
            }}
          >
            ⤡
          </button>
        </div>
      )}
      {resizeMode && (
        <>
          <div
            className="resize-handle r"
            onMouseDown={e => {
              e.stopPropagation();
              onResizeHandle('r', e);
            }}
          />
          <div
            className="resize-handle b"
            onMouseDown={e => {
              e.stopPropagation();
              onResizeHandle('b', e);
            }}
          />
          <div
            className="resize-handle br"
            onMouseDown={e => {
              e.stopPropagation();
              onResizeHandle('br', e);
            }}
          />
          <button
            className="resize-confirm"
            onClick={e => {
              e.stopPropagation();
              onConfirmResize();
            }}
            title="Done"
          >
            ✓
          </button>
        </>
      )}
    </div>
  );
}
