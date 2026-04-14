import { ButtonItem } from '../items/ButtonItem';
import { TodoItem } from '../items/TodoItem';
import { NotesItem } from '../items/NotesItem';
import { FolderItem } from '../items/FolderItem';
import { SketchItem } from '../items/SketchItem';
import { Item, ButtonData, TodoData, NotesData, FolderData, SketchData } from '../types';
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
  onMoveStart: (e: React.PointerEvent) => void;
  onResizeCornerDown: (corner: Corner, ev: React.PointerEvent) => void;
  searchQuery?: string;
  style?: React.CSSProperties;
  bg?: string;
  fg?: string;
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
  onMoveStart,
  onResizeCornerDown,
  searchQuery,
  style,
  bg,
  fg
}: Props) {
  const { dispatch } = useStore();
  const blocked = editMode || resizeMode;
  const isFolder = item.type === 'folder';

  let inner: React.ReactNode = null;
  if (item.type === 'button') {
    inner = <ButtonItem data={item.data as ButtonData} />;
  } else if (item.type === 'todo') {
    inner = (
      <TodoItem
        data={item.data as TodoData}
        onChange={d => dispatch({ type: 'UPDATE_ITEM_DATA', id: item.id, data: d })}
        searchQuery={searchQuery}
        editMode={editMode}
      />
    );
  } else if (item.type === 'notes') {
    inner = (
      <NotesItem
        data={item.data as NotesData}
        onChange={d => dispatch({ type: 'UPDATE_ITEM_DATA', id: item.id, data: d })}
        searchQuery={searchQuery}
      />
    );
  } else if (item.type === 'folder') {
    inner = (
      <FolderItem
        data={item.data as FolderData}
        bg={bg || '#ccc'}
        fg={fg || '#000'}
        onHeaderPointerDown={e => {
          if (editMode && !resizeMode && e.button === 0) {
            onMoveStart(e);
          }
        }}
      />
    );
  } else if (item.type === 'sketch') {
    inner = (
      <SketchItem
        data={item.data as SketchData}
        onChange={d => dispatch({ type: 'UPDATE_ITEM_DATA', id: item.id, data: d })}
        editable={editMode || resizeMode}
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
      onPointerDown={e => {
        // Folders: only header drags (handled by FolderItem). Skip here.
        if (isFolder) return;
        if (editMode && !resizeMode && e.button === 0) {
          onMoveStart(e);
        }
      }}
      data-item-id={item.id}
    >
      <div className={'item-content' + (blocked ? ' blocked' : '')}>{inner}</div>

      {editMode && !resizeMode && (
        <div className="item-actions">
          <button
            className="icon-btn"
            title="Edit"
            onPointerDown={e => e.stopPropagation()}
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
            onPointerDown={e => e.stopPropagation()}
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
              onPointerDown={e => {
                e.stopPropagation();
                e.preventDefault();
                onResizeCornerDown(c, e);
              }}
            />
          ))}
          <button
            className="resize-confirm"
            onPointerDown={e => e.stopPropagation()}
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
