import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { updateShade, rgbaToString, parseRgbString } from '../utils/colorUtils';
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

  // Helper function to update item color and log the change
  const updateAndLogColor = useCallback((selectedColor: string, baseColor?: string, gradient?: number) => {
    if (selectedItemId) {
      updateItem(selectedItemId, { 
        color: selectedColor,
        ...(baseColor && { baseColor }),
        ...(gradient !== undefined && { gradient })
      });
      logAction('changed_color', {
        itemID: selectedItemId,
        color: selectedColor,
        ...(baseColor && { baseColor }),
        ...(gradient !== undefined && { gradient })
      });
    }
  }, [selectedItemId, updateItem, logAction]);

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

      const baseColor = rgbaToString(newRgba);
      updateColorSelection({
        rgba: newRgba,
        position,
      });

      // Update selected item color
      if (selectedItemId) {
        const selectedColor = updateShade(newRgba, colorSelection.gradient);
        updateItem(selectedItemId, { 
          color: selectedColor,
          baseColor,
          gradient: colorSelection.gradient
        });
        updateAndLogColor(selectedColor, baseColor, colorSelection.gradient);
      }
    }
  }, [colorSelection.gradient, selectedItemId, updateColorSelection, updateItem, updateAndLogColor]);

  const handleGradientChange = useCallback((gradient: number) => {
    updateColorSelection({ gradient });

    if (selectedItemId) {
      const currentItem = useAppStore.getState().items.find(item => item.id === selectedItemId);
      if (!currentItem?.baseColor) return;
      const baseRgba = parseRgbString(currentItem.baseColor);
      if (!baseRgba) return;
      const selectedColor = updateShade({ ...baseRgba, a: 1 }, gradient);
      updateItem(selectedItemId, { 
        color: selectedColor,
        gradient
      });
      logAction('changed_color', {
        itemID: selectedItemId,
        color: selectedColor,
        gradient
      });
    }
  }, [selectedItemId, updateColorSelection, updateItem, logAction]);

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
    const baseColor = rgbaToString(rgba);
    updateColorSelection({ rgba });

    if (selectedItemId) {
      const selectedColor = updateShade(rgba, colorSelection.gradient);
      updateItem(selectedItemId, { 
        color: selectedColor,
        baseColor,
        gradient: colorSelection.gradient
      });
      updateAndLogColor(selectedColor, baseColor, colorSelection.gradient);
    }
  }, [colorSelection.gradient, selectedItemId, updateColorSelection, updateItem, updateAndLogColor]);

  const handleBrightnessChange = useCallback((gradient: number) => {
    updateColorSelection({ gradient });

    if (selectedItemId) {
      const selectedColor = updateShade(colorSelection.rgba, gradient);
      updateItem(selectedItemId, { color: selectedColor });
      updateAndLogColor(selectedColor, undefined, gradient);
    }
  }, [colorSelection.rgba, selectedItemId, updateColorSelection, updateItem, updateAndLogColor]);

  return {
    colorSelection,
    handleColorWheelClick,
    handleGradientChange,
    handleRgbInputChange,
    handleColorChange,
    handleBrightnessChange,
  };
}
