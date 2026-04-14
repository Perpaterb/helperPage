import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { TodoData } from '../types';

export function TodoItem({
  data,
  onChange,
  searchQuery,
  editMode
}: {
  data: TodoData;
  onChange: (d: TodoData) => void;
  searchQuery?: string;
  editMode?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange({ ...data, entries: [...data.entries, { id: nanoid(6), text, done: false }] });
    setDraft('');
  };
  const toggle = (id: string) => {
    onChange({
      ...data,
      entries: data.entries.map(e => (e.id === id ? { ...e, done: !e.done } : e))
    });
  };
  const del = (id: string) => {
    onChange({ ...data, entries: data.entries.filter(e => e.id !== id) });
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
    dragIdx.current = null;
    setDragOverIdx(null);
    if (from == null || from === idx) return;
    const next = [...data.entries];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange({ ...data, entries: next });
  };
  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const q = searchQuery?.toLowerCase() || '';
  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const stop = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

  return (
    <div className="item-todo" onMouseDown={e => e.stopPropagation()}>
      <div className="item-todo-title">{data.title || 'To-do'}</div>
      <div className="item-todo-list">
        {data.entries.map((e, idx) => (
          <div
            key={e.id}
            className={
              'todo-row' +
              (e.done ? ' done' : '') +
              (editMode ? ' reorder' : '') +
              (dragOverIdx === idx ? ' drag-over' : '')
            }
            style={q && !matches(e.text) ? { opacity: 0.2 } : undefined}
            draggable={editMode}
            onDragStart={editMode ? () => handleDragStart(idx) : undefined}
            onDragOver={editMode ? ev => handleDragOver(ev, idx) : undefined}
            onDrop={editMode ? () => handleDrop(idx) : undefined}
            onDragEnd={editMode ? handleDragEnd : undefined}
          >
            {editMode ? (
              <span className="todo-grip" title="Drag to reorder">⠿</span>
            ) : (
              <input type="checkbox" checked={e.done} onChange={() => toggle(e.id)} />
            )}
            <span className="todo-text">{e.text}</span>
            <button
              className="todo-del"
              onMouseDown={stop}
              onClick={ev => { stop(ev); del(e.id); }}
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <form
        className="todo-add"
        onSubmit={ev => {
          ev.preventDefault();
          add();
        }}
      >
        <input
          type="text"
          placeholder="Add task…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <button type="submit">+</button>
      </form>
    </div>
  );
}
