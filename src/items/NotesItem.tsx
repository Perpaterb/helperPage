import { useRef, useState } from 'react';
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
  const taRef = useRef<HTMLTextAreaElement>(null);

  const apply = (next: string, selStart: number, selEnd: number) => {
    onChange({ ...data, markdown: next });
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const wrap = (before: string, after: string = before) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = ta.value;
    const sel = v.slice(start, end);
    const next = v.slice(0, start) + before + sel + after + v.slice(end);
    if (sel) {
      apply(next, start + before.length, end + before.length);
    } else {
      apply(next, start + before.length, start + before.length);
    }
  };

  const prefixLines = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = ta.value;
    const lineStart = v.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndIdx = v.indexOf('\n', end);
    const blockEnd = lineEndIdx === -1 ? v.length : lineEndIdx;
    const block = v.slice(lineStart, blockEnd);
    const newBlock = block
      .split('\n')
      .map(l => prefix + l)
      .join('\n');
    const next = v.slice(0, lineStart) + newBlock + v.slice(blockEnd);
    apply(next, lineStart, lineStart + newBlock.length);
  };

  const insertBlock = (text: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = ta.value;
    const prefix = start > 0 && v[start - 1] !== '\n' ? '\n' : '';
    const next = v.slice(0, start) + prefix + text + v.slice(end);
    apply(next, start + prefix.length, start + prefix.length + text.length);
  };

  const tb = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onClick: fn
  });

  return (
    <div className="item-notes" onMouseDown={e => e.stopPropagation()}>
      <div className="item-notes-header">
        <span className="item-notes-title">{data.title || 'Notes'}</span>
        <button className="notes-mode-btn" onClick={() => setEditing(!editing)}>
          {editing ? 'Preview' : 'Edit'}
        </button>
      </div>
      {editing && (
        <div className="notes-toolbar">
          <button {...tb(() => prefixLines('# '))} title="Heading 1">
            H1
          </button>
          <button {...tb(() => prefixLines('## '))} title="Heading 2">
            H2
          </button>
          <button {...tb(() => prefixLines('### '))} title="Heading 3">
            H3
          </button>
          <span className="tb-sep" />
          <button {...tb(() => wrap('**'))} title="Bold">
            <b>B</b>
          </button>
          <button {...tb(() => wrap('*'))} title="Italic">
            <i>I</i>
          </button>
          <button {...tb(() => wrap('~~'))} title="Strikethrough">
            <s>S</s>
          </button>
          <button {...tb(() => wrap('`'))} title="Inline code">
            {'</>'}
          </button>
          <span className="tb-sep" />
          <button {...tb(() => wrap('[', '](url)'))} title="Link">
            🔗
          </button>
          <button {...tb(() => insertBlock('```\ncode\n```'))} title="Code block">
            {'{ }'}
          </button>
          <button
            {...tb(() => insertBlock('| A | B |\n|---|---|\n| 1 | 2 |'))}
            title="Table"
          >
            ▦
          </button>
          <span className="tb-sep" />
          <button {...tb(() => prefixLines('- '))} title="Bullet list">
            •
          </button>
          <button {...tb(() => prefixLines('1. '))} title="Numbered list">
            1.
          </button>
          <button {...tb(() => prefixLines('- [ ] '))} title="Task list">
            ☐
          </button>
          <button {...tb(() => prefixLines('> '))} title="Quote">
            ❝
          </button>
          <button {...tb(() => insertBlock('---'))} title="Horizontal rule">
            ―
          </button>
        </div>
      )}
      {editing ? (
        <textarea
          ref={taRef}
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
