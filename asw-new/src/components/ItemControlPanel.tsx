import React, { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { RadioButtonGroup } from './RadioButtonGroup';
import { Button } from './Button';
import { MOVEMENT_OPTIONS } from '../constants/movementOptions';
import type { WearableItem } from '../types';

export const ItemControlPanel: React.FC = React.memo(() => {
  const { 
    selectedItemId, 
    items,
    moveItemToFront,
    moveItemToBack,
  } = useAppStore();
  
  const { updateItemConfiguration } = useDragAndDrop();
  
  const selectedItem = useMemo(() => 
    items.find(item => item.id === selectedItemId), 
    [items, selectedItemId]
  );

  const handleMovementChange = useCallback((movement: string) => {
    if (selectedItem) {
      // This will now trigger animations through the enhanced updateItemConfiguration
      updateItemConfiguration(selectedItem.id, { movement: movement as WearableItem['movement'] });
    }
  }, [selectedItem, updateItemConfiguration]);

  const handleCustomNameChange = useCallback((customName: string) => {
    if (selectedItem) {
      updateItemConfiguration(selectedItem.id, { 
        customName,
        cyoName: customName.substring(0, 4)
      });
    }
  }, [selectedItem, updateItemConfiguration]);

  const handleMoveToFront = useCallback(() => {
    if (selectedItem) {
      moveItemToFront(selectedItem.id);
    }
  }, [selectedItem, moveItemToFront]);

  const handleMoveToBack = useCallback(() => {
    if (selectedItem) {
      moveItemToBack(selectedItem.id);
    }
  }, [selectedItem, moveItemToBack]);

  if (!selectedItem) {
    return (
      <div className="movement" style={{ display: 'none' }}>
        {/* Movement controls will be shown when item is selected */}
      </div>
    );
  }

  const renderMovementOptions = () => {
    const movementOptions = MOVEMENT_OPTIONS[selectedItem.type];
    
    // Special case for 'other' type - show text input instead of radio buttons
    if (selectedItem.type === 'other') {
      return (
        <div id="other-movement">
          <label htmlFor="cyo-name2" id="cyo-name2-label">Item name:</label>
          <input 
            type="text" 
            id="cyo-name2"
            value={selectedItem.customName || ''}
            onChange={(e) => handleCustomNameChange(e.target.value)}
          />
        </div>
      );
    }

    // Special case for 'display' type - no options
    if (selectedItem.type === 'display') {
      return <div id="display-movement"></div>;
    }

    // Render radio button group for all other types
    if (movementOptions && movementOptions.length > 0) {
      return (
        <RadioButtonGroup
          name="item-movement"
          options={movementOptions}
          selectedValue={selectedItem.movement || ''}
          onChange={handleMovementChange}
          className={`${selectedItem.type}-movement`}
        />
      );
    }

    return null;
  };

  return (
    <div className="movement">
      {/* Movement options */}
      <div>
        {renderMovementOptions()}
      </div>
    </div>
  );
});
