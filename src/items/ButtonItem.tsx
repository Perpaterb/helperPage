import { ButtonData } from '../types';

export function ButtonItem({ data }: { data: ButtonData }) {
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
  };
  return (
    <button
      className="item-button"
      onClick={open}
      style={{ background: data.bg || '#4a90e2' }}
      title={data.url}
    >
      <span className="item-button-text">{data.text || 'Link'}</span>
    </button>
  );
}
