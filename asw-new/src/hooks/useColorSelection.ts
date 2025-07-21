import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { updateShade } from '../utils/colorUtils';
import type { RGBA, Position } from '../types';

/**
 * Hook for managing color selection functionality
 */
export function useColorSelection() {
  const {
    colorSelection,
    updateColorSelection,
    selectedItemId,
    updateItem,
    logAction,
  } = useAppStore();

  const handleColorWheelClick = useCallback((
    imageData: ImageData,
    position: Position
  ) => {
    const rgba = imageData.data;
    if (rgba[3] !== 0) { // Not transparent
      const newRgba: RGBA = {
        r: rgba[0],
        g: rgba[1],
        b: rgba[2],
        a: rgba[3] / 255,
      };

      updateColorSelection({
        rgba: newRgba,
        position,
      });

      // Update selected item color
      if (selectedItemId) {
        const selectedColor = updateShade(newRgba, colorSelection.gradient);
        updateItem(selectedItemId, { color: selectedColor });
        logAction('changed_color', {
          itemID: selectedItemId,
          color: selectedColor,
        });
      }
    }
  }, [colorSelection.gradient, selectedItemId, updateColorSelection, updateItem, logAction]);

  const handleGradientChange = useCallback((gradient: number) => {
    updateColorSelection({ gradient });

    if (selectedItemId) {
      const selectedColor = updateShade(colorSelection.rgba, gradient);
      updateItem(selectedItemId, { color: selectedColor });
      logAction('changed_color', {
        itemID: selectedItemId,
        color: selectedColor,
      });
    }
  }, [colorSelection.rgba, selectedItemId, updateColorSelection, updateItem, logAction]);

  const handleRgbInputChange = useCallback((rgbString: string) => {
    const rgbMatch = rgbString.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      const newRgba: RGBA = {
        r: parseInt(r, 10),
        g: parseInt(g, 10),
        b: parseInt(b, 10),
        a: 1,
      };

      updateColorSelection({ rgba: newRgba });

      if (selectedItemId) {
        const selectedColor = updateShade(newRgba, colorSelection.gradient);
        updateItem(selectedItemId, { color: selectedColor });
        logAction('changed_color', {
          itemID: selectedItemId,
          color: selectedColor,
        });
      }
    }
  }, [colorSelection.gradient, selectedItemId, updateColorSelection, updateItem, logAction]);

  const handleColorChange = useCallback((rgba: RGBA) => {
    updateColorSelection({ rgba });

    if (selectedItemId) {
      const selectedColor = updateShade(rgba, colorSelection.gradient);
      updateItem(selectedItemId, { color: selectedColor });
      logAction('changed_color', {
        itemID: selectedItemId,
        color: selectedColor,
      });
    }
  }, [colorSelection.gradient, selectedItemId, updateColorSelection, updateItem, logAction]);

  const handleBrightnessChange = useCallback((gradient: number) => {
    updateColorSelection({ gradient });

    if (selectedItemId) {
      const selectedColor = updateShade(colorSelection.rgba, gradient);
      updateItem(selectedItemId, { color: selectedColor });
      logAction('changed_color', {
        itemID: selectedItemId,
        color: selectedColor,
      });
    }
  }, [colorSelection.rgba, selectedItemId, updateColorSelection, updateItem, logAction]);

  return {
    colorSelection,
    handleColorWheelClick,
    handleGradientChange,
    handleRgbInputChange,
    handleColorChange,
    handleBrightnessChange,
  };
}
