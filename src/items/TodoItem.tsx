import { useState } from 'react';
import { nanoid } from 'nanoid';
import { TodoData } from '../types';

export function TodoItem({
  data,
  onChange
}: {
  data: TodoData;
  onChange: (d: TodoData) => void;
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
  return (
    <div className="item-todo" onMouseDown={e => e.stopPropagation()}>
      <div className="item-todo-title">{data.title || 'To-do'}</div>
      <div className="item-todo-list">
        {data.entries.map(e => (
          <div key={e.id} className={'todo-row' + (e.done ? ' done' : '')}>
            <input type="checkbox" checked={e.done} onChange={() => toggle(e.id)} />
            <span className="todo-text">{e.text}</span>
            <button className="todo-del" onClick={() => del(e.id)} title="Delete">
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
