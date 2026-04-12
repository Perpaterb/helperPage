import { HexColorPicker } from 'react-colorful';

const SWATCHES = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#ffffff',
  '#1f2430',
  '#000000'
];

export function ColorPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
  return (
    <div className="color-picker">
      <HexColorPicker color={safe} onChange={onChange} />
      <div className="color-picker-row">
        <div className="color-preview" style={{ background: safe }} />
        <input
          type="text"
          className="color-hex-input"
          value={value}
          maxLength={7}
          onChange={e => {
            let v = e.target.value.trim();
            if (v && !v.startsWith('#')) v = '#' + v;
            onChange(v);
          }}
        />
      </div>
      <div className="color-swatches">
        {SWATCHES.map(c => (
          <button
            key={c}
            type="button"
            className={'color-swatch-btn' + (c.toLowerCase() === safe.toLowerCase() ? ' selected' : '')}
            style={{ background: c }}
            onClick={() => onChange(c)}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}
