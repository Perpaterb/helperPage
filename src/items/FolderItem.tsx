import { FolderData } from '../types';

export function FolderItem({
  data,
  bg,
  fg,
  onHeaderMouseDown
}: {
  data: FolderData;
  bg: string;
  fg: string;
  onHeaderMouseDown?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="item-folder" style={{ color: fg }}>
      <div
        className="item-folder-header"
        style={{ background: bg, color: fg }}
        onMouseDown={onHeaderMouseDown}
      >
        <span className="item-folder-title">{data.title || 'Folder'}</span>
      </div>
      <div className="item-folder-body" style={{ background: bg }} />
    </div>
  );
}
