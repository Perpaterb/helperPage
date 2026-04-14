import { FolderData } from '../types';

export function FolderItem({
  data,
  bg,
  fg,
  onHeaderPointerDown
}: {
  data: FolderData;
  bg: string;
  fg: string;
  onHeaderPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <div className="item-folder" style={{ color: fg }}>
      <div
        className="item-folder-header"
        style={{ background: bg, color: fg }}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="item-folder-title">{data.title || 'Folder'}</span>
      </div>
      <div className="item-folder-body" style={{ background: bg }} />
    </div>
  );
}
