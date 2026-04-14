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
  return (
    <div className="item-notes" onMouseDown={e => e.stopPropagation()}>
      {data.title ? (
        <div className="item-notes-header">
          <span className="item-notes-title">{data.title}</span>
        </div>
      ) : null}
      <div className="item-notes-body">
        <CrepeEditor
          value={data.markdown}
          onChange={md => onChange({ ...data, markdown: md })}
        />
      </div>
    </div>
  );
}
