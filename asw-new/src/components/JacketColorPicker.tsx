import React, { useCallback, useState, useEffect } from 'react';
import Wheel from '@uiw/react-color-wheel';
import Slider from 'rc-slider';
import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import { useAppStore } from '../store/appStore';
import { rgbaToHex, hexToRgba } from '../utils/colorUtils';
import { Button } from './Button';
import 'rc-slider/assets/index.css';

interface JacketColorPickerProps {
  jacketColorWheelImage?: HTMLImageElement | null; // Keep for backward compatibility but not used
}

export const JacketColorPicker: React.FC<JacketColorPickerProps> = () => {
  const { jacketConfig, updateJacketConfig, logAction, copyColor, pasteColor, copiedColor, colorTxt } = useAppStore();

  // Convert current jacket color to hex and then to HSVA for the wheel
  const currentHex = rgbaToHex({ 
    r: jacketConfig.color.r, 
    g: jacketConfig.color.g, 
    b: jacketConfig.color.b, 
    a: 1 
  });
  const [hsva, setHsva] = useState(hexToHsva(currentHex));

  // Update HSVA when jacket color changes
  useEffect(() => {
    const newHsva = hexToHsva(currentHex);
    setHsva(newHsva);
  }, [currentHex]);

  // Handle color change from the circular color wheel
  const handleWheelChange = useCallback((color: any) => {
    setHsva(color.hsva);
    const hex = hsvaToHex(color.hsva);
    const rgba = hexToRgba(hex);
    const newColor = {
      r: rgba.r,
      g: rgba.g,
      b: rgba.b,
    };

    updateJacketConfig({
      color: newColor,
    });

    logAction('changed_jacket_color', {
      color: newColor
    });
  }, [updateJacketConfig, logAction]);

  // Handle tint/brightness change
  const handleTintChange = useCallback((value: number | number[]) => {
    const gradient = Array.isArray(value) ? value[0] : value;
    
    // Update the jacket config with the new gradient value
    updateJacketConfig({ 
      gradient,
      // Also include current color to ensure a re-render
      color: {
        r: jacketConfig.color.r,
        g: jacketConfig.color.g,
        b: jacketConfig.color.b
      }
    });
    
    // Log the action with gradient
    logAction('changed_jacket_color', { 
      color: jacketConfig.color,
      gradient
    });
  }, [updateJacketConfig, logAction, jacketConfig.color]);

  const handleCopyJacketColor = useCallback(() => {
    const jacketColorHex = rgbaToHex({ 
      r: jacketConfig.color.r, 
      g: jacketConfig.color.g, 
      b: jacketConfig.color.b, 
      a: 1 
    });
    copyColor(jacketColorHex);
    logAction('copied_jacket_color', { color: jacketColorHex });
  }, [copyColor, logAction, jacketConfig.color]);

  const handlePasteToJacket = useCallback(() => {
    pasteColor();
    logAction('pasted_color_to_jacket', {});
  }, [pasteColor, logAction]);

  return (
    <div className="modern-jacket-color-picker">
      <div className="jacket-color-label">
        <span className="color-section-title">Jacket Color:</span>
      </div>
      
      <div className="jacket-color-picker-container">
        <Wheel 
          color={hsva} 
          onChange={handleWheelChange}
          width={100}
          height={100}
        />
      </div>
      
      <div className="jacket-tint-control">
        <Slider
          min={0}
          max={10}
          value={jacketConfig.gradient}
          onChange={handleTintChange}
          className="tint-slider"
          trackStyle={{ backgroundColor: 'var(--primary-blue)' }}
          handleStyle={{ 
            backgroundColor: 'var(--primary-blue)',
            borderColor: 'var(--primary-blue)'
          }}
        />
      </div>

      <div className="jacket-color-copy-paste" style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <Button
          variant="light-blue"
          size="small"
          onClick={handleCopyJacketColor}
        >
          Copy
        </Button>
        <Button
          variant="light-blue"
          size="small"
          onClick={handlePasteToJacket}
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
            color: '#ffffff',
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
          {colorTxt}
        </div>
      )}
    </div>
  );
};
