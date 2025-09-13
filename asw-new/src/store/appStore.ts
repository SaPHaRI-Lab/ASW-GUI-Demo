import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ApplicationState, WearableItem, ColorSelection, JacketConfig, ActionLog, Position } from '../types';
import { hexToRgba, updateShade, parseRgbString } from '../utils/colorUtils';

interface AppStore extends ApplicationState {
  itemCounters: Record<string, number>;
  
  // Actions
  addItem: (item: WearableItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<WearableItem>, options?: { recordUndo?: boolean }) => void;
  updateItemPosition: (id: string, position: Position) => void;
  saveUndoState: () => void;
  selectItem: (id: string | null, skipLogging?: boolean) => void;
  deselectItem: (id: string) => void;
  selectMultipleItems: (ids: string[]) => void;
  duplicateItem: (id: string) => void;
  deleteSelectedItem: () => void;
  moveItemToFront: (id: string) => void;
  moveItemToBack: (id: string) => void;
  moveMultipleItems: (itemIds: string[], targetView: 'front' | 'back') => void;
  updateColorSelection: (colorSelection: Partial<ColorSelection>) => void;
  updateJacketConfig: (config: Partial<JacketConfig>) => void;
  updateJacketConfig2: (config: Partial<JacketConfig>) => void; // Will not be able to undo/redo view change
  toggleItemFlashing: (id: string) => void;
  clearSelection: () => void;
  
  // Color copy/paste functionality
  copiedColor: string | null;
  colorTxt: 'Copied' | 'Pasted' | null;
  copiedBaseColor: string | null;
  copiedColorGradient: number | null;
  copyColor: (color: string) => void;
  pasteColor: () => void;
  
  // Element copy/paste functionality
  copiedItem: WearableItem | null;
  copyItem: () => void;
  pasteItem: () => void;
  
  // Session management
  startSession: (participantId: string, designCode: string) => void;
  endSession: () => void;
  waitPopupShown: () => void;
  
  // State persistence
  saveState: () => void;
  loadState: () => void;
  
  // Action logging
  actionLogs: ActionLog[];
  logAction: (type: string, data: any) => void;
  
  // Undo/Redo functionality
  undoStack: string[];
  redoStack: string[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    items: [],
    selectedItemId: null,
    itemCounters: {},
    colorSelection: {
      rgba: { r: 227, g: 227, b: 227, a: 1 },
      position: { x: 0, y: 0 },
      gradient: 5,
    },
    jacketConfig: {
      view: 'front',
      color: { r: 255, g: 255, b: 255 },
      colorPosition: null,
      gradient: 5,
    },
    sessionInfo: {
      participantId: '',
      designCode: '',
      startTime: 0,
      waitPopupTime: undefined,
      isActive: false,
    },
    flashingItems: new Set<string>(),
    actionLogs: [],
    undoStack: [],
    redoStack: [],
    copiedColor: null,
    colorTxt: null,
    copiedBaseColor: null,
    copiedColorGradient: null,
    copiedItem: null,

    // Session management
    startSession: (participantId: string, designCode: string) => {
      set({
        sessionInfo: {
          participantId,
          designCode,
          startTime: Date.now(),
          waitPopupTime: undefined,
          isActive: true,
        },
      });
      get().logAction('session_started', {
        participantId,
        designCode,
        startTime: Date.now(),
      });
    },

    waitPopupShown: () => {
      const { sessionInfo } = get();
      set({
        sessionInfo: {
          ...sessionInfo,
          waitPopupTime: Date.now()
        }
      });
      get().logAction('wait_popup_shown', { timestamp: Date.now() });
    },

    endSession: () => {
      const { sessionInfo } = get();
      get().logAction('session_ended', {
        participantId: sessionInfo.participantId,
        designCode: sessionInfo.designCode,
        duration: Date.now() - sessionInfo.startTime,
      });
      set({
        sessionInfo: {
          participantId: '',
          designCode: '',
          startTime: 0,
          isActive: false,
        },
      });
    },

    // Actions
    addItem: (item) => set((state) => {
      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      
      return {
        items: [...state.items, item],
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [], // Clear redo stack on new action
      };
    }),

    removeItem: (id) => set((state) => {
      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      
      return {
        items: state.items.filter(item => item.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        flashingItems: new Set([...state.flashingItems].filter(itemId => itemId !== id)),
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [], // Clear redo stack on new action
      };
    }),

    updateItem: (id, updates, options) => set((state) => {
      const recordUndo = options?.recordUndo !== false;
      let undoStack = state.undoStack;
      let redoStack = state.redoStack;
      if (recordUndo) {
        const currentStateStr = JSON.stringify({
          items: state.items,
          selectedItemId: state.selectedItemId,
          colorSelection: state.colorSelection,
          jacketConfig: state.jacketConfig,
        });
        undoStack = [...state.undoStack, currentStateStr];
        redoStack = [];
      }
      return {
        items: state.items.map(item => 
          item.id === id ? { ...item, ...updates } : item
        ),
        undoStack,
        redoStack,
      };
    }),

    updateItemPosition: (id, position) => set((state) => ({
      items: state.items.map(item => 
        item.id === id ? { ...item, position } : item
      ),
    })),

    saveUndoState: () => set((state) => {
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      
      return {
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [], // Clear redo stack on new action
      };
    }),

    selectItem: (id: string | null, skipLogging?: boolean) => {
      // Reset color selection when selecting a new item
      const currentItem = id ? get().items.find(item => item.id === id) : null;
      set(state => ({
        selectedItemId: id,
        items: state.items.map(item => ({
          ...item,
          isSelected: item.id === id,
        })),
        colorSelection: {
          rgba: currentItem?.baseColor ? {
            r: parseInt(currentItem.baseColor.match(/\d+/g)?.[0] || '227'),
            g: parseInt(currentItem.baseColor.match(/\d+/g)?.[1] || '227'),
            b: parseInt(currentItem.baseColor.match(/\d+/g)?.[2] || '227'),
            a: 1
          } : { r: 227, g: 227, b: 227, a: 1 },
          position: { x: 0, y: 0 },
          gradient: currentItem?.gradient ?? 5
        }
      }));
      if (id && !skipLogging) {
        get().logAction('item_selected', { itemID: id });
      }
    },

    deselectItem: (id) => set((state) => {
      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      
      return {
        selectedItemId: null,
        items: state.items.map(item => ({
          ...item,
          isSelected: false,
        })),
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [],
      };
    }),

    selectMultipleItems: (ids) => set((state) => ({
      selectedItemId: ids.length === 1 ? ids[0] : null,
      items: state.items.map(item => ({
        ...item,
        isSelected: ids.includes(item.id),
      })),
    })),

    duplicateItem: (id) => set((state) => {
      const itemsToDuplicate = state.items.filter(item => item.isSelected);
      if (itemsToDuplicate.length === 0) {
        const singleItem = state.items.find(item => item.id === id);
        if (!singleItem) return state;
        itemsToDuplicate.push(singleItem);
      }

      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });

      const timestamp = Date.now();
      const duplicatedItems = itemsToDuplicate.map(item => ({
        ...item,
        id: `${item.type}_CLONED_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: item.position.x + 40,
          y: item.position.y + 40,
        },
        isSelected: true,
      }));

      return {
        items: [
          ...state.items.map(item => ({ ...item, isSelected: false })),
          ...duplicatedItems
        ],
        selectedItemId: duplicatedItems.length === 1 ? duplicatedItems[0].id : null,
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [], // Clear redo stack on new action
      };
    }),

    deleteSelectedItem: () => set((state) => {
      if (!state.selectedItemId) return state;

      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });

      return {
        items: state.items.filter(item => item.id !== state.selectedItemId),
        selectedItemId: null,
        flashingItems: new Set([...state.flashingItems].filter(itemId => itemId !== state.selectedItemId)),
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [], // Clear redo stack on new action
      };
    }),

    moveItemToFront: (id) => set((state) => {
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      return {
        items: state.items.map(item =>
          item.id === id ? { ...item, view: 'front' } : item
        ),
        jacketConfig: { ...state.jacketConfig, view: 'front' },
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [],
      };
    }),
    moveItemToBack: (id) => set((state) => {
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      return {
        items: state.items.map(item =>
          item.id === id ? { ...item, view: 'back' } : item
        ),
        jacketConfig: { ...state.jacketConfig, view: 'back' },
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [],
      };
    }),

    moveMultipleItems: (itemIds: string[], targetView: 'front' | 'back') => set((state) => {
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      return {
        items: state.items.map(item =>
          itemIds.includes(item.id) ? { ...item, view: targetView } : item
        ),
        jacketConfig: { ...state.jacketConfig, view: targetView },
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [],
      };
    }),

    updateColorSelection: (colorSelection) => set((state) => ({
      colorSelection: { ...state.colorSelection, ...colorSelection },
    })),

    updateJacketConfig: (config) => set((state) => {
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      return {
        jacketConfig: { ...state.jacketConfig, ...config },
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [],
      };
    }),

    updateJacketConfig2: (config) => set((state) => ({
      jacketConfig: { ...state.jacketConfig, ...config },
    })),

    toggleItemFlashing: (id) => set((state) => {
      const newFlashingItems = new Set(state.flashingItems);
      if (newFlashingItems.has(id)) {
        newFlashingItems.delete(id);
      } else {
        newFlashingItems.add(id);
      }
      return {
        flashingItems: newFlashingItems,
        items: state.items.map(item => 
          item.id === id ? { ...item, isFlashing: newFlashingItems.has(id) } : item
        ),
      };
    }),

    clearSelection: () => set((state) => ({
      selectedItemId: null,
      items: state.items.map(item => ({ ...item, isSelected: false })),
    })),

    saveState: () => {
      const state = get();
      const stateToSave = {
        items: state.items,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
        flashingItems: Array.from(state.flashingItems),
      };
      localStorage.setItem('asw-gui-state', JSON.stringify(stateToSave));
    },

    loadState: () => {
      try {
        const savedState = localStorage.getItem('asw-gui-state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          set({
            items: parsed.items || [],
            colorSelection: parsed.colorSelection || get().colorSelection,
            jacketConfig: parsed.jacketConfig || get().jacketConfig,
            flashingItems: new Set(parsed.flashingItems || []),
          });
        }
      } catch (error) {
        console.error('Failed to load state:', error);
      }
    },

    logAction: (type, data) => set((state) => ({
      actionLogs: [...state.actionLogs, {
        type,
        data,
        timestamp: Date.now(),
      }],
    })),

    // Undo/Redo functionality
    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
    
    undo: () => {
      const state = get();
      if (state.undoStack.length > 0) {
        const currentStateStr = JSON.stringify({
          items: state.items,
          selectedItemId: state.selectedItemId,
          colorSelection: state.colorSelection,
          jacketConfig: state.jacketConfig,
        });
        
        const previousStateStr = state.undoStack[state.undoStack.length - 1];
        const previousState = JSON.parse(previousStateStr);
        
        set({
          ...previousState,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, currentStateStr],
        });
      }
    },
    
    redo: () => {
      const state = get();
      if (state.redoStack.length > 0) {
        const currentStateStr = JSON.stringify({
          items: state.items,
          selectedItemId: state.selectedItemId,
          colorSelection: state.colorSelection,
          jacketConfig: state.jacketConfig,
        });
        
        const nextStateStr = state.redoStack[state.redoStack.length - 1];
        const nextState = JSON.parse(nextStateStr);
        
        set({
          ...nextState,
          undoStack: [...state.undoStack, currentStateStr],
          redoStack: state.redoStack.slice(0, -1),
        });
      }
    },
    
    // Color copy/paste functionality
    copyColor: (color) => {
      const { selectedItemId, items, jacketConfig, colorSelection } = get();
      let copiedBaseColor: string | null = null;
      let copiedGradient: number | null = null;

      if (selectedItemId) {
        const selectedItem = items.find(i => i.id === selectedItemId);
        if (selectedItem) {
          copiedBaseColor = selectedItem.baseColor 
            || `rgb(${colorSelection.rgba.r}, ${colorSelection.rgba.g}, ${colorSelection.rgba.b})`;
          copiedGradient = (selectedItem.gradient ?? colorSelection.gradient);
        }
      } else {
        copiedBaseColor = `rgb(${jacketConfig.color.r}, ${jacketConfig.color.g}, ${jacketConfig.color.b})`;
        copiedGradient = jacketConfig.gradient ?? null;
      }

      set({
        copiedColor: color,
        copiedBaseColor,
        copiedColorGradient: copiedGradient,
        colorTxt: 'Copied'
      });
    },

    // Element copy/paste functionality
    copyItem: () => {
      const { selectedItemId, items, jacketConfig } = get();
      if (selectedItemId) {
        const selectedItem = items.find(item => item.id === selectedItemId);
        if (selectedItem) {
          set({ copiedItem: { ...selectedItem } });
        }
      }
    },

    pasteItem: () => {
      const state = get();
      const selectedItems = state.items.filter(item => item.isSelected);
      const timestamp = Date.now();
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      if (selectedItems.length >= 1) {
        const newItems = selectedItems.map(item => ({
          ...item,
          id: `${item.type}_CLONED_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          position: {
            x: item.position.x + 40,
            y: item.position.y + 40
          },
          view: state.jacketConfig.view,
          isSelected: true
        }));
        set(state => ({
          items: [
            ...state.items.map(item => ({ ...item, isSelected: false })),
            ...newItems
          ],
          selectedItemId: newItems.length === 1 ? newItems[0].id : null,
          undoStack: [...state.undoStack, currentStateStr],
          redoStack: [],
        }));
        get().logAction('duplicated_items', {
          count: newItems.length,
          itemIds: newItems.map(i => i.id),
        });
      } else if (state.copiedItem) {
        const newItem: WearableItem = {
          ...state.copiedItem,
          id: `${state.copiedItem.type}_CLONED_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          position: {
            x: state.copiedItem.position.x + 40,
            y: state.copiedItem.position.y + 40
          },
          view: state.jacketConfig.view
        };
        set(state => ({
          items: [
            ...state.items.map(item => ({ ...item, isSelected: false })),
            { ...newItem, isSelected: true }
          ],
          selectedItemId: newItem.id,
          undoStack: [...state.undoStack, currentStateStr],
          redoStack: [],
        }));
        get().logAction('duplicated_item', {
          itemId: newItem.id,
        });
      }
    },

    pasteColor: () => {
      const state = get();
      const { copiedColor, copiedBaseColor, copiedColorGradient } = state;
      if (!copiedColor) return;
      set({ colorTxt: 'Pasted' });

      // Determine base color and gradient to apply
      const baseRgbaFromHex = hexToRgba(copiedColor);
      const baseRgbaFromString = copiedBaseColor ? parseRgbString(copiedBaseColor) : null;
      const baseRgba = baseRgbaFromString ? { ...baseRgbaFromString, a: 1 } : baseRgbaFromHex;
      const gradientToApply = (copiedColorGradient ?? state.colorSelection.gradient);

      // Apply to selected items if any
      const selectedItems = state.items.filter(item => item.isSelected);
      if (selectedItems.length > 0) {
        state.saveUndoState();
        // Update UI selection model so the gradient slider reflects source gradient
        state.updateColorSelection({ rgba: baseRgba, position: { x: 0, y: 0 }, gradient: gradientToApply });

        selectedItems.forEach(item => {
          const shaded = updateShade(baseRgba, gradientToApply);
          state.updateItem(item.id, {
            color: shaded,
            baseColor: `rgb(${baseRgba.r}, ${baseRgba.g}, ${baseRgba.b})`,
            gradient: gradientToApply
          }, { recordUndo: false });
        });
      } else {
        // Paste to jacket color: set base color and gradient
        state.updateJacketConfig({
          color: { r: baseRgba.r, g: baseRgba.g, b: baseRgba.b },
          gradient: gradientToApply
        });
      }
    },
  }))
);

// Auto-save state changes
useAppStore.subscribe((state) => {
  state.saveState();
});
