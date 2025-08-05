import React, { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { Button } from './Button';

interface ScaleControlsProps {
  itemId: string;
}

export const ScaleControls: React.FC<ScaleControlsProps> = ({ itemId }) => {
  const { items, updateItem } = useAppStore();
  const selectedItem = items.find(item => item.id === itemId);

  const handleSizeChange = useCallback((delta: number) => {
    if (!selectedItem) return;
    const currentSize = selectedItem.size ?? 1;
    const newSize = Math.max(0.5, Math.min(currentSize + delta, 2));
    updateItem(itemId, { size: newSize });
  }, [selectedItem, itemId, updateItem]);

  const handleAmountChange = useCallback((delta: number) => {
    if (!selectedItem || !['fur-patch', 'light-strip'].includes(selectedItem.type)) return;
    
    if (selectedItem.type === 'light-strip') {
      const currentAmount = selectedItem.amount ?? 6;
      const newAmount = Math.max(2, Math.min(currentAmount + delta, 12));
      updateItem(itemId, { amount: newAmount });
    } else {
      const currentAmount = selectedItem.amount ?? 15;
      const newAmount = Math.max(15, Math.min(currentAmount + (delta * 2), 31));
      updateItem(itemId, { amount: newAmount });
    }
  }, [selectedItem, itemId, updateItem]);

  if (!selectedItem) return null;

  return (
    <div className="scale-controls" style={{ marginLeft: '12px', marginTop: '25px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
      <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center' }}>Size</h2>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button
            variant="light-blue"
            size="small"
            onClick={() => handleSizeChange(-0.1)}
          >
            -
          </Button>
          <Button
            variant="light-blue"
            size="small"
            onClick={() => handleSizeChange(0.1)}
          >
            +
          </Button>
        </div>
      </div>

      {(selectedItem.type === 'fur-patch' || selectedItem.type === 'light-strip') && (
        <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center' }}>Amount</h2>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Button
              variant="light-blue"
              size="small"
              onClick={() => handleAmountChange(-1)}
            >
              -
            </Button>
            <Button
              variant="light-blue"
              size="small"
              onClick={() => handleAmountChange(1)}
            >
              +
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 