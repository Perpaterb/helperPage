import { ButtonData } from '../types';

function faviconUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
}

export function ButtonItem({ data }: { data: ButtonData }) {
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
  };
  const showIcon = data.showFavicon !== false;
  const iconSrc = showIcon && data.url ? faviconUrl(data.url) : null;

  return (
    <button className="item-button" onClick={open} title={data.url}>
      {iconSrc && (
        <img
          className="item-button-favicon"
          src={iconSrc}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <span className="item-button-text">{data.text || 'Link'}</span>
    </button>
  );
}
