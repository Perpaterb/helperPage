import { useRef, useState } from 'react';
import { SketchData, SketchStroke } from '../types';

export function SketchItem({
  data,
  onChange,
  editable
}: {
  data: SketchData;
  onChange: (d: SketchData) => void;
  editable: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [current, setCurrent] = useState<SketchStroke | null>(null);
  const penColor = data.penColor || '#000000';
  const penSize = data.penSize || 3;

  const toLocal = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    // Normalize to 0-1000 space
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1000,
      y: ((e.clientY - rect.top) / rect.height) * 1000
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (editable) return; // drawing only in non-edit mode
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = toLocal(e);
    setCurrent({ color: penColor, width: penSize, points: [x, y] });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!current) return;
    const { x, y } = toLocal(e);
    setCurrent({ ...current, points: [...current.points, x, y] });
  };

  const onPointerUp = () => {
    if (current && current.points.length >= 2) {
      onChange({ ...data, strokes: [...data.strokes, current] });
    }
    setCurrent(null);
  };

  const pointsToPath = (points: number[]) => {
    if (points.length < 2) return '';
    let d = `M ${points[0]} ${points[1]}`;
    for (let i = 2; i < points.length; i += 2) {
      d += ` L ${points[i]} ${points[i + 1]}`;
    }
    return d;
  };

  const clear = () => onChange({ ...data, strokes: [] });
  const undo = () => onChange({ ...data, strokes: data.strokes.slice(0, -1) });

  return (
    <div className="item-sketch">
      <div className="item-sketch-toolbar">
        <span className="item-sketch-title">{data.title || 'Sketch'}</span>
        <input
          type="color"
          value={penColor}
          onChange={e => onChange({ ...data, penColor: e.target.value })}
          title="Pen colour"
        />
        <input
          type="range"
          min={1}
          max={20}
          value={penSize}
          onChange={e => onChange({ ...data, penSize: Number(e.target.value) })}
          title="Pen size"
        />
        <button className="tb-btn" onClick={undo} title="Undo">↶</button>
        <button className="tb-btn" onClick={clear} title="Clear">✕</button>
      </div>
      <svg
        ref={svgRef}
        className="item-sketch-canvas"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {data.strokes.map((s, i) => (
          <path
            key={i}
            d={pointsToPath(s.points)}
            stroke={s.color}
            strokeWidth={s.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {current && (
          <path
            d={pointsToPath(current.points)}
            stroke={current.color}
            strokeWidth={current.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}
