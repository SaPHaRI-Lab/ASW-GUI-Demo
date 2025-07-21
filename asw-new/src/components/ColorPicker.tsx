import React, { useCallback, useState, useEffect } from 'react';
import Wheel from '@uiw/react-color-wheel';
import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import { useColorSelection } from '../hooks/useColorSelection';
import { rgbaToHex, hexToRgba } from '../utils/colorUtils';

interface ColorPickerProps {
  colorWheelImage?: HTMLImageElement | null; // Keep for backward compatibility but not used
}

export const ColorPicker: React.FC<ColorPickerProps> = () => {
  const { colorSelection, handleColorChange } = useColorSelection();

  // Convert current RGBA to hex and then to HSVA for the wheel
  const currentHex = rgbaToHex(colorSelection.rgba);
  const [hsva, setHsva] = useState(hexToHsva(currentHex));

  // Update HSVA when colorSelection changes
  useEffect(() => {
    const newHsva = hexToHsva(currentHex);
    setHsva(newHsva);
  }, [currentHex]);

  // Handle color change from the circular color wheel
  const handleWheelChange = useCallback((color: any) => {
    setHsva(color.hsva);
    const hex = hsvaToHex(color.hsva);
    const rgba = hexToRgba(hex);
    handleColorChange(rgba);
  }, [handleColorChange]);

  return (
    <div className="modern-color-picker">
      <div className="color-picker-container">
        <Wheel 
          color={hsva} 
          onChange={handleWheelChange}
          width={140}
          height={140}
        />
      </div>
    </div>
  );
};
