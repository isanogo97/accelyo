/**
 * Theme white-label dynamique.
 * ----------------------------------------------------------------
 * La couleur de marque (establishment.brandColor) pilote l'accent de
 * toute l'app. On derive quelques variantes a partir de cette couleur.
 */

/** Palette neutre commune (fond clair facon maquette). */
export const palette = {
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  border: '#E8EDF3',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  success: '#16A34A',
  successBg: '#DCFCE7',
} as const;

export interface Theme {
  brand: string;
  brandDark: string;
  brandTint: string;
  onBrand: string;
}

const FALLBACK_BRAND = '#2563EB';

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Normalise une couleur hex (#rgb ou #rrggbb) en {r,g,b}. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** Assombrit une couleur (ratio 0..1, 0.15 = 15% plus sombre). */
function darken(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb.r * (1 - ratio), rgb.g * (1 - ratio), rgb.b * (1 - ratio));
}

/** Teinte translucide pour les fonds d'icones / pilules. */
function tint(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Choisit blanc/noir selon la luminance de la couleur de marque. */
function contrastOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.6 ? '#0F172A' : '#FFFFFF';
}

/** Construit un theme a partir d'une couleur de marque. */
export function buildTheme(brandColor?: string | null): Theme {
  const brand = hexToRgb(brandColor ?? '') ? (brandColor as string) : FALLBACK_BRAND;
  return {
    brand,
    brandDark: darken(brand, 0.18),
    brandTint: tint(brand, 0.12),
    onBrand: contrastOn(brand),
  };
}

export const defaultTheme = buildTheme(FALLBACK_BRAND);
