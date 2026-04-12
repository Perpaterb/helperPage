import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NotesData } from '../types';

export function NotesItem({
  data,
  onChange
}: {
  data: NotesData;
  onChange: (d: NotesData) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="item-notes" onMouseDown={e => e.stopPropagation()}>
      <div className="item-notes-header">
        <span className="item-notes-title">{data.title || 'Notes'}</span>
        <button className="notes-mode-btn" onClick={() => setEditing(!editing)}>
          {editing ? 'Preview' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          className="notes-editor"
          value={data.markdown}
          onChange={e => onChange({ ...data, markdown: e.target.value })}
          spellCheck={false}
        />
      ) : (
        <div
          className="notes-preview"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.markdown || ''}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
