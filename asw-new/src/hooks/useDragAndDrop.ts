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
    customName?: string
  ) => {
    
    // Get the current highest zIndex for new items
    const maxZIndex = Math.max(...items.map(item => item.zIndex || 0), 0);
    
    const newItem: WearableItem = {
      id: generateId(),
      type,
      position,
      color: 'rgb(227, 227, 227)', // Default color
      movement: 'static',
      speed: 50,
      customName,
      isSelected: false,
      isFlashing: false,
      view: jacketConfig.view,
      zIndex: maxZIndex + 1,
    };

    addItem(newItem);
    selectItem(newItem.id);
    logAction('item_created', {
      itemID: newItem.id,
      type,
      position,
    });

    return newItem;
  }, [addItem, selectItem, logAction, jacketConfig, items]);

  const moveItem = useCallback((itemId: string, position: Position) => {
    updateItemPosition(itemId, position);
    logAction('item_moved', {
      itemID: itemId,
      position,
    });
  }, [updateItemPosition, logAction]);

  const updateItemConfiguration = useCallback((
    itemId: string,
    updates: {
      movement?: WearableItem['movement'];
      speed?: number;
      customName?: string;
      color?: string;
    }
  ) => {
    updateItem(itemId, updates);
    logAction('item_configured', {
      itemID: itemId,
      updates,
    });
  }, [updateItem, logAction]);

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
