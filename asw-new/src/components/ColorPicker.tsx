import React, { useCallback, useState, useEffect } from 'react';
import Wheel from '@uiw/react-color-wheel';
import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import { useColorSelection } from '../hooks/useColorSelection';
import { useAppStore } from '../store/appStore';
import { rgbaToHex, hexToRgba } from '../utils/colorUtils';
import { Button } from './Button';

interface ColorPickerProps {
  colorWheelImage?: HTMLImageElement | null; // Keep for backward compatibility but not used
}

export const ColorPicker: React.FC<ColorPickerProps> = () => {
  const { colorSelection, handleColorChange } = useColorSelection();
  const { copyColor, pasteColor, copiedColor, selectedItemId, items } = useAppStore();

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

  // Handle copy color
  const handleCopyColor = useCallback(() => {
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (selectedItem?.color) {
      copyColor(selectedItem.color);
    }
  }, [copyColor, items, selectedItemId]);

  // Handle paste color
  const handlePasteColor = useCallback(() => {
    pasteColor();
  }, [pasteColor]);

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
      
      {/* Copy/Paste Color Buttons */}
      <div className="color-actions" style={{ marginTop: '10px', display: 'flex', gap: '5px', justifyContent: 'center' }}>
        <Button 
          size="small" 
          variant="secondary"
          onClick={handleCopyColor}
          disabled={!selectedItemId}
          title="Copy color (Ctrl+C)"
        >
          Copy
        </Button>
        <Button 
          size="small" 
          variant="secondary"
          onClick={handlePasteColor}
          disabled={!copiedColor}
          title="Paste color (Ctrl+V)"
        >
          Paste
        </Button>
      </div>
      
      {copiedColor && (
        <div 
          className="copied-color-preview" 
          style={{ 
            marginTop: '5px', 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: copiedColor, 
              borderRadius: '2px',
              border: '1px solid #ccc'
            }}
          ></div>
          Copied
        </div>
      )}
    </div>
  );
};
