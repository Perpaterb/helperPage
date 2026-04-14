import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import { NotesData } from '../types';

// Remark plugin: map container/leaf/text directives with known names to
// <div class="callout callout-TYPE">… content …</div> in the rendered tree.
function remarkCallouts() {
  const allowed = new Set(['warning', 'info', 'tip', 'danger', 'note']);
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (!allowed.has(node.name)) return;
        const data = node.data || (node.data = {});
        data.hName = 'div';
        data.hProperties = {
          className: `callout callout-${node.name}`,
          'data-label': node.name
        };
      }
    });
  };
}

// Preprocess: convert ==x== to <mark>x</mark> for highlight support.
function preprocessMd(src: string): string {
  return src.replace(/==(.+?)==/g, '<mark>$1</mark>');
}

interface Btn {
  label: string | React.ReactNode;
  title: string;
  run: () => void;
}

export function NotesItem({
  data,
  onChange,
  searchQuery
}: {
  data: NotesData;
  onChange: (d: NotesData) => void;
  searchQuery?: string;
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

  const wrap = (before: string, after: string = before, placeholder = 'text') => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = ta.value;
    const sel = v.slice(start, end);
    const body = sel || placeholder;
    const next = v.slice(0, start) + before + body + after + v.slice(end);
    const sStart = start + before.length;
    const sEnd = sStart + body.length;
    apply(next, sStart, sEnd);
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

  // Insert a full block with leading/trailing newlines so it always sits
  // on its own, preserving multi-line selections inside.
  const insertFencedBlock = (prefix: string, suffix: string, placeholder: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = ta.value;
    const sel = v.slice(start, end);
    const leading = start > 0 && v[start - 1] !== '\n' ? '\n' : '';
    const trailing = end < v.length && v[end] !== '\n' ? '\n' : '';
    const body = sel || placeholder;
    const block = leading + prefix + body + suffix + trailing;
    const next = v.slice(0, start) + block + v.slice(end);
    const bodyStart = start + leading.length + prefix.length;
    const bodyEnd = bodyStart + body.length;
    apply(next, bodyStart, bodyEnd);
  };

  const codeBlock = () => insertFencedBlock('```\n', '\n```', 'code');
  const callout = (type: string) =>
    insertFencedBlock(`:::${type}\n`, '\n:::', 'Write something...');
  const table = () =>
    insertFencedBlock('', '', '| Col 1 | Col 2 |\n| --- | --- |\n| A | B |');
  const hr = () => insertFencedBlock('', '', '---');

  // Button model so styling + layout stays consistent.
  const buttons: (Btn | 'sep')[] = [
    { label: 'H1', title: 'Heading 1', run: () => prefixLines('# ') },
    { label: 'H2', title: 'Heading 2', run: () => prefixLines('## ') },
    { label: 'H3', title: 'Heading 3', run: () => prefixLines('### ') },
    'sep',
    { label: <b>B</b>, title: 'Bold', run: () => wrap('**', '**', 'bold') },
    { label: <i>I</i>, title: 'Italic', run: () => wrap('*', '*', 'italic') },
    { label: <s>S</s>, title: 'Strikethrough', run: () => wrap('~~', '~~', 'strike') },
    { label: '⌘', title: 'Inline code', run: () => wrap('`', '`', 'code') },
    { label: '≡', title: 'Code block', run: codeBlock },
    'sep',
    { label: '🔗', title: 'Link', run: () => wrap('[', '](https://)', 'text') },
    { label: '🖍', title: 'Highlight', run: () => wrap('==', '==', 'highlight') },
    { label: '▦', title: 'Table', run: table },
    { label: '―', title: 'Horizontal rule', run: hr },
    'sep',
    { label: '•', title: 'Bullet list', run: () => prefixLines('- ') },
    { label: '1.', title: 'Numbered list', run: () => prefixLines('1. ') },
    { label: '☐', title: 'Task list', run: () => prefixLines('- [ ] ') },
    { label: '❝', title: 'Quote', run: () => prefixLines('> ') },
    'sep',
    { label: '⚠', title: 'Warning callout', run: () => callout('warning') },
    { label: 'ℹ', title: 'Info callout', run: () => callout('info') },
    { label: '💡', title: 'Tip callout', run: () => callout('tip') },
    { label: '⛔', title: 'Danger callout', run: () => callout('danger') }
  ];

  const prepared = useMemo(() => {
    let md = preprocessMd(data.markdown || '');
    if (searchQuery) {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      md = md.replace(
        new RegExp(`(${escaped})`, 'gi'),
        '<mark class="search-hit">$1</mark>'
      );
    }
    return md;
  }, [data.markdown, searchQuery]);

  return (
    <div className="item-notes" onMouseDown={e => e.stopPropagation()}>
      <div className="item-notes-header">
        <span className="item-notes-title">{data.title || 'Notes'}</span>
        <button className="notes-mode-btn" onClick={() => setEditing(!editing)}>
          {editing ? 'Preview' : 'Code'}
        </button>
        <span className="item-notes-spacer" />
      </div>
      {editing && (
        <div className="notes-toolbar">
          {buttons.map((b, i) => {
            if (b === 'sep') return <span key={'s' + i} className="tb-sep" />;
            return (
              <button
                key={i}
                className="tb-btn"
                title={b.title}
                onMouseDown={e => e.preventDefault()}
                onClick={b.run}
              >
                {b.label}
              </button>
            );
          })}
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
        <>
          <textarea
            className="notes-editor notes-editor-preview"
            value={data.markdown}
            onChange={e => onChange({ ...data, markdown: e.target.value })}
            spellCheck={false}
            placeholder="Write markdown here…"
          />
          <div className="notes-preview" title="Live preview">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts]}
              rehypePlugins={[rehypeRaw]}
            >
              {prepared}
            </ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
}
