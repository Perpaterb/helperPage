import { useState } from 'react';
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
  const move = (idx: number, delta: number) => {
    const next = [...data.entries];
    const to = idx + delta;
    if (to < 0 || to >= next.length) return;
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    onChange({ ...data, entries: next });
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
            className={'todo-row' + (e.done ? ' done' : '') + (editMode ? ' reorder' : '')}
            style={q && !matches(e.text) ? { opacity: 0.2 } : undefined}
          >
            {editMode ? (
              <>
                <button
                  className="todo-reorder"
                  title="Move up"
                  disabled={idx === 0}
                  onMouseDown={stop}
                  onClick={ev => { stop(ev); move(idx, -1); }}
                >
                  ▲
                </button>
                <button
                  className="todo-reorder"
                  title="Move down"
                  disabled={idx === data.entries.length - 1}
                  onMouseDown={stop}
                  onClick={ev => { stop(ev); move(idx, 1); }}
                >
                  ▼
                </button>
              </>
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
