import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { generateId } from '../utils/colorUtils';
import type { WearableItem, Position } from '../types';

/**
 * Hook for managing drag-and-drop functionality
 */
export function useDragAndDrop() {
  const {
    items,
    addItem,
    updateItem,
    updateItemPosition,
    saveUndoState,
    selectItem,
    logAction,
    jacketConfig,
  } = useAppStore();

  const createItem = useCallback((
    type: WearableItem['type'],
    position: Position,
    customName?: string,
    customInput?: string
  ) => {
    
    // Get the current highest zIndex for new items
    const maxZIndex = Math.max(...items.map(item => item.zIndex || 0), 0);
    
    const newItem: WearableItem = {
      id: generateId(type),
      type,
      position,
      color: type === 'speaker' ? '#1d1d1d' : 'rgb(227, 227, 227)',
      gradient: 5,
      movement: 'static',
      speed: 3,
      amount: type === 'light-strip' ? 6 : type === 'fur-patch' ? 15 : undefined,
      verticalRows: type === 'fur-patch' ? 3 : undefined,
      customName: type === 'other' ? customName : undefined,
      cyoName: type === 'other' ? customName?.substring(0, 4) : undefined,
      customInput: type === 'other' ? customInput : '',
      isSelected: false,
      isFlashing: false,
      view: jacketConfig.view,
      zIndex: maxZIndex + 1,
      rotation: 0, // Default rotation
    };

    // Reset color selection state
    const { updateColorSelection } = useAppStore.getState();
    updateColorSelection({
      rgba: { r: 227, g: 227, b: 227, a: 1 },
      position: { x: 0, y: 0 },
      gradient: 5
    });

    addItem(newItem);
    selectItem(newItem.id, true);
    logAction('item_created', {
      itemID: newItem.id,
      type,
      position,
      customName,
      customInput
    });

    return newItem;
  }, [addItem, selectItem, logAction, jacketConfig, items]);

  const moveItem = useCallback((itemId: string, position: Position, skipLogging?: boolean) => {
    updateItemPosition(itemId, position);
    if (!skipLogging) {
      logAction('item_moved', {
        itemID: itemId,
        position,
      });
    }
  }, [updateItemPosition, logAction]);

  // Update the ItemConfiguration type to include customInput
  interface ItemConfiguration {
    movement?: WearableItem['movement'];
    speed?: number;
    customName?: string;
    customInput?: string;
    color?: string;
    cyoName?: string;
    animationStartTime?: number;
  }

  const updateItemConfiguration = useCallback((
    itemId: string,
    updates: ItemConfiguration
  ) => {
    const { toggleItemFlashing } = useAppStore.getState();
    
    // Save undo state before making changes
    saveUndoState();
    
    // Set animation start time when movement changes for light items
    if (updates.movement) {
      const currentItem = items.find(item => item.id === itemId);
      const needsAnimationTime = 
        currentItem?.type === 'light-strip' || 
        currentItem?.type === 'light-ind' ||
        (currentItem?.type === 'inflatable' && ['Inflate', 'Deflate'].includes(updates.movement));
      if (needsAnimationTime) {
        updates.animationStartTime = Date.now();
      }
    }
    
    // Update item configuration
    updateItem(itemId, updates, { recordUndo: false })
    
    // Handle animation triggers when movement changes
    if (updates.movement) {
      const currentItem = items.find(item => item.id === itemId);
      const wasFlashing = currentItem?.isFlashing;
      
      switch (updates.movement) {
        case 'Flash ind':
        case 'Flash str':
        case 'Trickle up':
        case 'Trickle down':
        case 'Random fl':
        case 'Inflate':
        case 'Deflate':
          // Start flashing animation for all flash-based movements
          if (!wasFlashing) {
            toggleItemFlashing(itemId);
          }
          break;
        case 'Light on ind':
        case 'Light on str':
          // Stop flashing, keep steady glow
          if (wasFlashing) {
            toggleItemFlashing(itemId);
          }
          break;
        case 'static':
        default:
          // Stop all animations for static movement
          if (wasFlashing) {
            toggleItemFlashing(itemId);
          }
          break;
      }
    }
    
    logAction('item_configured', {
      itemID: itemId,
      updates,
    });
  }, [updateItem, logAction, saveUndoState, items]);

  const handleItemClick = useCallback((itemId: string) => {
    selectItem(itemId);
    logAction('item_selected', { itemID: itemId });
  }, [selectItem, logAction]);

  const getItemsAtPosition = useCallback((position: Position, tolerance = 20) => {
    return items.filter(item => {
      // Only check items on current view
      if (item.view !== jacketConfig.view) return false;
      
      const distance = Math.sqrt(
        Math.pow(item.position.x - position.x, 2) +
        Math.pow(item.position.y - position.y, 2)
      );
      return distance <= tolerance;
    });
  }, [items, jacketConfig]);

  return {
    items: items.filter(item => item.view === jacketConfig.view),
    createItem,
    moveItem,
    updateItemConfiguration,
    handleItemClick,
    getItemsAtPosition,
    saveUndoState,
  };
}
