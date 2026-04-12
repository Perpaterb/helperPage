// Color helpers for per-mode item backgrounds.

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

export function invertLightness(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const [h, s, l] = hexToHsl(hex);
  // Clamp to avoid pure black / pure white: keep some contrast
  const newL = Math.max(0.08, Math.min(0.92, 1 - l));
  return hslToHex(h, s, newL);
}

export function textColorFor(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#222';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1a1a1a' : '#ffffff';
}

// Resolve an item's background for the active theme. Accepts legacy `bg`
// plus the new per-mode `bgLight` / `bgDark` fields and falls back by
// inverting lightness when only one side is set.
export function resolveBg(
  data: { bg?: string; bgLight?: string; bgDark?: string },
  darkMode: boolean
): string {
  if (darkMode) {
    if (data.bgDark) return data.bgDark;
    const base = data.bgLight || data.bg;
    if (base) return invertLightness(base);
    return '#1f2430';
  }
  if (data.bgLight) return data.bgLight;
  if (data.bg) return data.bg;
  return '#ffffff';
}
