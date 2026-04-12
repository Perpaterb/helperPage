import { ButtonItem } from '../items/ButtonItem';
import { TodoItem } from '../items/TodoItem';
import { NotesItem } from '../items/NotesItem';
import { Item, ButtonData, TodoData, NotesData } from '../types';
import { useStore } from '../store';
import { Corner } from '../uiContext';

interface Props {
  item: Item;
  editMode: boolean;
  resizeMode: boolean;
  isDragging: boolean;
  activeCorner: Corner | null;
  onEdit: () => void;
  onStartResize: () => void;
  onExitResize: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onResizeCornerDown: (corner: Corner, ev: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export function ItemView({
  item,
  editMode,
  resizeMode,
  isDragging,
  activeCorner,
  onEdit,
  onStartResize,
  onExitResize,
  onDragStart,
  onDragEnd,
  onResizeCornerDown,
  style
}: Props) {
  const { dispatch } = useStore();
  const blocked = editMode || resizeMode;

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

  const cls =
    'item type-' +
    item.type +
    (editMode ? ' edit' : '') +
    (resizeMode ? ' resize' : '') +
    (isDragging ? ' dragging' : '');

  return (
    <div
      className={cls}
      style={style}
      draggable={editMode && !resizeMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-item-id={item.id}
    >
      <div className={'item-content' + (blocked ? ' blocked' : '')}>{inner}</div>

      {editMode && !resizeMode && (
        <div className="item-actions">
          <button
            className="icon-btn"
            title="Edit"
            onMouseDown={e => e.stopPropagation()}
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
            onMouseDown={e => e.stopPropagation()}
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
          {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
            <div
              key={c}
              className={'corner-handle ' + c + (activeCorner === c ? ' active' : '')}
              onMouseDown={e => {
                e.stopPropagation();
                e.preventDefault();
                onResizeCornerDown(c, e);
              }}
            />
          ))}
          <button
            className="resize-confirm"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              onExitResize();
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
