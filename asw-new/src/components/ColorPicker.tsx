import React, { useCallback, useState, useEffect } from 'react';
import Wheel from '@uiw/react-color-wheel';
import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import { useColorSelection } from '../hooks/useColorSelection';
import { useAppStore } from '../store/appStore';
import { rgbaToHex, hexToRgba, rgbToHex, updateShade, parseRgbString } from '../utils/colorUtils';
import { Button } from './Button';
import { ColorInfoPopup } from './ColorInfoPopup';
import Slider from 'rc-slider';

interface ColorPickerProps {
  colorWheelImage?: HTMLImageElement | null; // Keep for backward compatibility but not used
}

export const ColorPicker: React.FC<ColorPickerProps> = () => {
  const { colorSelection, handleColorChange, handleBrightnessChange } = useColorSelection();
  const { copyColor, pasteColor, copiedColor, colorTxt, copiedBaseColor, copiedColorGradient, selectedItemId, items, logAction } = useAppStore();
  const [showColorInfo, setShowColorInfo] = useState(false);

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
      let hexColor = selectedItem.baseColor || selectedItem.color;
      if (!hexColor.startsWith('#')) {
        if (hexColor.startsWith('rgb')) {
          const match = hexColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
          if (match) {
            const [, r, g, b] = match.map(Number);
            hexColor = rgbToHex({ r, g, b });
          }
        } else {
          hexColor = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
        }
      }
      copyColor(hexColor);
      logAction('copied_item_color', { itemId: selectedItem.id, color: hexColor });
    }
  }, [copyColor, items, selectedItemId, logAction]);

  // Handle paste color
  const handlePasteColor = useCallback(() => {
    pasteColor();
    logAction('pasted_color_to_item', { itemId: selectedItemId, color: copiedColor });
  }, [pasteColor, selectedItemId, logAction]);

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
      
      {/* Gradient Slider */}
      <div className="gradient-control" style={{marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Slider
          min={0}
          max={10}
          value={colorSelection.gradient}
          onChange={value => handleBrightnessChange(Array.isArray(value) ? value[0] : value)}
          className="color-slider"
          trackStyle={{ background: 'linear-gradient(to right, white, gray, black)' }}
          handleStyle={{ backgroundColor: 'var(--primary-blue)', borderColor: 'var(--primary-blue)' }}
        />
      </div>
      
      {/* Copy/Paste Color Buttons */}
      <div className="color-actions" style={{ marginTop: '10px', display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
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
        <button
          className="color-info-button"
          onClick={() => setShowColorInfo(true)}
          style={{
            border: 'none',
            borderRadius: '50%',
            marginLeft: '5px',
            height: '20px',
            width: '20px',
            color: 'white',
            backgroundColor: 'rgb(126, 126, 126)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          ?
        </button>
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
              backgroundColor: (() => {
                const baseFromString = copiedBaseColor ? parseRgbString(copiedBaseColor) : null;
                const baseRgba = baseFromString ? { r: baseFromString.r, g: baseFromString.g, b: baseFromString.b, a: 1 } : hexToRgba(copiedColor);
                const grad = typeof copiedColorGradient === 'number' ? copiedColorGradient : 5;
                return updateShade(baseRgba, grad);
              })(), 
              borderRadius: '2px',
              border: '1px solid #ccc'
            }}
          ></div>
          {colorTxt}
        </div>
      )}

      <ColorInfoPopup 
        isVisible={showColorInfo} 
        onClose={() => setShowColorInfo(false)} 
      />
    </div>
  );
};
