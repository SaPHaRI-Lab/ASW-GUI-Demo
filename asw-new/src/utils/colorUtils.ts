import type { RGB, RGBA } from '../types';

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert hex color to RGBA object
 */
export function hexToRgba(hex: string): RGBA {
  const rgb = hexToRgb(hex);
  return rgb ? { ...rgb, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert RGB object to hex string
 */
export function rgbToHex(rgb: RGB): string {
  return `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)}`;
}

/**
 * Convert RGBA object to hex string
 */
export function rgbaToHex(rgba: RGBA): string {
  return rgbToHex({ r: rgba.r, g: rgba.g, b: rgba.b });
}

/**
 * Convert RGBA values to CSS color string
 */
export function rgbaToString(rgba: RGBA): string {
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

/**
 * Update color shade based on gradient value
 * @param baseRgba Base color in RGBA format
 * @param gradient Gradient value (0-10, where 5 is neutral)
 * @returns CSS color string
 */
export function updateShade(baseRgba: RGBA, gradient: number): string {
  let color: RGB;
  
  if (gradient <= 5) {
    // Lighten the color
    const ratio = gradient / 5;
    color = {
      r: Math.round(255 + (baseRgba.r - 255) * ratio),
      g: Math.round(255 + (baseRgba.g - 255) * ratio),
      b: Math.round(255 + (baseRgba.b - 255) * ratio),
    };
  } else {
    // Darken the color
    const ratio = (gradient - 5) / 5;
    color = {
      r: Math.round(baseRgba.r * (1 - ratio)),
      g: Math.round(baseRgba.g * (1 - ratio)),
      b: Math.round(baseRgba.b * (1 - ratio)),
    };
  }
  
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Generate unique ID for items
 */
export function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a point is inside a canvas element based on image data
 */
export function isPointInCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): boolean {
  try {
    const imageData = ctx.getImageData(x, y, 1, 1);
    return imageData.data[3] !== 0; // Check alpha channel
  } catch {
    return false;
  }
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parse RGB string to RGB object
 */
export function parseRgbString(rgbString: string): RGB | null {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return null;
}

/**
 * Format RGB object to CSS rgb string
 */
export function formatRgbString(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function adjustColor(color: string, amount: number): string {
  const rgb = color.match(/\d+/g)?.map(Number);
  if (!rgb || rgb.length < 3) return color;
  const adjusted = rgb.map(value => {
    const newValue = value + amount;
    return Math.min(255, Math.max(0, newValue));
  });
  return `rgb(${adjusted[0]}, ${adjusted[1]}, ${adjusted[2]})`;
}