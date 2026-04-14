import { useState } from 'react';
import { NotesData } from '../types';
import { CrepeEditor } from './CrepeEditor';

export function NotesItem({
  data,
  onChange
}: {
  data: NotesData;
  onChange: (d: NotesData) => void;
  searchQuery?: string;
}) {
  const [codeView, setCodeView] = useState(false);
  return (
    <div className="item-notes" onMouseDown={e => e.stopPropagation()}>
      <div className="item-notes-header">
        <span className="item-notes-title">{data.title || 'Notes'}</span>
        <button
          className="notes-mode-btn"
          onClick={() => setCodeView(!codeView)}
          title={codeView ? 'Switch to live preview' : 'Switch to raw markdown'}
        >
          {codeView ? 'Preview' : 'Code'}
        </button>
        <span className="item-notes-spacer" />
      </div>
      <div className="item-notes-body">
        {codeView ? (
          <textarea
            className="notes-editor"
            value={data.markdown}
            onChange={e => onChange({ ...data, markdown: e.target.value })}
            spellCheck={false}
            placeholder="Write markdown here…"
          />
        ) : (
          <CrepeEditor
            value={data.markdown}
            onChange={md => onChange({ ...data, markdown: md })}
          />
        )}
      </div>
    </div>
  );
}
