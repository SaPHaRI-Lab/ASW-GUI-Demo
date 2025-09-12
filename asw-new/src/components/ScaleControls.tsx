import React, { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { Button } from './Button';

interface ScaleControlsProps {
  itemId: string;
}

export const ScaleControls: React.FC<ScaleControlsProps> = ({ itemId }) => {
  const { items, updateItem, logAction } = useAppStore();
  const selectedItem = items.find(item => item.id === itemId);

  const handleSizeChange = useCallback((delta: number) => {
    if (!selectedItem) return;
    const currentSize = selectedItem.size ?? 1;
    const newSize = Math.max(0.5, Math.min(currentSize + delta, 2));
    updateItem(itemId, { size: newSize });
    logAction('changed_item_size', { itemId, oldSize: currentSize, newSize });
  }, [selectedItem, itemId, updateItem, logAction]);

  const handleAmountChange = useCallback((delta: number) => {
    if (!selectedItem || !['fur-patch', 'light-strip'].includes(selectedItem.type)) return;
    
    if (selectedItem.type === 'light-strip') {
      const currentAmount = selectedItem.amount ?? 6;
      const newAmount = Math.max(2, Math.min(currentAmount + delta, 12));
      updateItem(itemId, { amount: newAmount });
      logAction('changed_light_strip_amount', { itemId, oldAmount: currentAmount, newAmount });
    } else {
      const currentAmount = selectedItem.amount ?? 15;
      const newAmount = Math.max(15, Math.min(currentAmount + (delta * 2), 31));
      updateItem(itemId, { amount: newAmount });
      logAction('changed_fur_patch_width', { itemId, oldAmount: currentAmount, newAmount });
    }
  }, [selectedItem, itemId, updateItem, logAction]);

  const handleVerticalRowsInc = useCallback((delta: number) => {
    if (!selectedItem || selectedItem.type !== 'fur-patch') return;
    const currentRows = selectedItem.verticalRows ?? 3;
    if (currentRows === 3 && delta < 0) return;
    const newRows = Math.max(3, Math.min(currentRows + delta, 10));
    if (newRows !== currentRows) {
      updateItem(itemId, { verticalRows: newRows });
      logAction('changed_fur_patch_length', { 
        itemId: itemId, 
        oldRows: currentRows, 
        newRows 
      });
    }
  }, [selectedItem, itemId, updateItem, logAction]);

  const handleLengthChange = useCallback((delta: number) => {
    if ((!selectedItem || selectedItem.type !== 'light-strip') && (!selectedItem || selectedItem.type !== 'inflatable')) return;
    if (selectedItem.type === 'light-strip') {
      const currentLength = selectedItem.length ?? 1;
      const newLength = Math.max(0.33, Math.min(currentLength + delta * 0.1, 1.8));
      if (newLength !== currentLength) {
        updateItem(itemId, { length: newLength });
        logAction('changed_item_length', { 
          itemId: itemId, 
          oldLength: currentLength, 
          newLength 
        });
      }
    } else if (selectedItem.type === 'inflatable') {
      const currentLength = selectedItem.inflatableLength ?? 17.5;
      const newLength = Math.max(10, Math.min(currentLength + delta * 2, 70));
      if (newLength !== currentLength) {
        updateItem(itemId, { inflatableLength: newLength });
        logAction('changed_item_length', { 
          itemId: itemId, 
          oldLength: currentLength, 
          newLength 
        });
      }
    }
  }, [selectedItem, itemId, updateItem, logAction]);

  const handleInflatableWidthChange = useCallback((delta: number) => {
    if (!selectedItem || selectedItem.type !== 'inflatable') return;
    const currentWidth = selectedItem.inflatableWidth ?? 27.5;
    const newWidth = Math.max(15, Math.min(currentWidth + delta * 2, 90));
    if (newWidth !== currentWidth) {
      updateItem(itemId, { inflatableWidth: newWidth });
      logAction('changed_item_width', { 
        itemId: itemId, 
        oldWidth: currentWidth, 
        newWidth 
      });
    }
  }, [selectedItem, itemId, updateItem, logAction]);

  if (!selectedItem) return null;

  return (
    <div className="scale-controls" style={{ marginLeft: '12px', marginTop: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      {selectedItem.type !== 'speaker' && (
        <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Size</h2>
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
      )}

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
        {selectedItem.type === 'fur-patch' && (
          <>
            <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Width</h2>
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

            <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Length</h2>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                  variant="light-blue"
                  size="small"
                  onClick={() => handleVerticalRowsInc(-1)}
                >
                  -
                </Button>
                <Button
                  variant="light-blue"
                  size="small"
                  onClick={() => handleVerticalRowsInc(1)}
                >
                  +
                </Button>
              </div>
            </div>
          </>
        )}

        {selectedItem.type === 'light-strip' && (
          <>
            <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Amount</h2>
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

            <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Length</h2>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                  variant="light-blue"
                  size="small"
                  onClick={() => handleLengthChange(-1)}
                >
                  -
                </Button>
                <Button
                  variant="light-blue"
                  size="small"
                  onClick={() => handleLengthChange(1)}
                >
                  +
                </Button>
              </div>
            </div>
          </>
        )}

      {selectedItem.type === 'inflatable' && (
        <>
            <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Width</h2>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                  variant="light-blue"
                  size="small"
                  onClick={() => handleInflatableWidthChange(-1)}
                >
                  -
                </Button>
                <Button
                  variant="light-blue"
                  size="small"
                  onClick={() => handleInflatableWidthChange(1)}
                >
                  +
                </Button>
              </div>
            </div>
            
            <div className="control-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'normal', textAlign: 'center', color: 'white' }}>Length</h2>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button
                variant="light-blue"
                size="small"
                onClick={() => handleLengthChange(-1)}
              >
                -
              </Button>
              <Button
                variant="light-blue"
                size="small"
                onClick={() => handleLengthChange(1)}
              >
                +
              </Button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}; 