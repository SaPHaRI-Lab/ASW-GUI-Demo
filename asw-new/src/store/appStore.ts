import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ApplicationState, WearableItem, ColorSelection, JacketConfig, ActionLog, Position, SessionInfo } from '../types';

interface AppStore extends ApplicationState {
  // Actions
  addItem: (item: WearableItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<WearableItem>) => void;
  updateItemPosition: (id: string, position: Position) => void;
  saveUndoState: () => void;
  selectItem: (id: string | null) => void;
  duplicateItem: (id: string) => void;
  deleteSelectedItem: () => void;
  moveItemToFront: (id: string) => void;
  moveItemToBack: (id: string) => void;
  updateColorSelection: (colorSelection: Partial<ColorSelection>) => void;
  updateJacketConfig: (config: Partial<JacketConfig>) => void;
  toggleItemFlashing: (id: string) => void;
  clearSelection: () => void;
  
  // Session management
  startSession: (participantId: string, designCode: string) => void;
  endSession: () => void;
  
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
    colorSelection: {
      rgba: { r: 227, g: 227, b: 227, a: 1 },
      position: { x: 0, y: 0 },
      gradient: 5,
    },
    jacketConfig: {
      view: 'front',
      color: { r: 227, g: 227, b: 227 },
      colorPosition: null,
      gradient: 5,
    },
    sessionInfo: {
      participantId: '',
      designCode: '',
      startTime: 0,
      isActive: false,
    },
    flashingItems: new Set<string>(),
    actionLogs: [],
    undoStack: [],
    redoStack: [],

    // Session management
    startSession: (participantId: string, designCode: string) => {
      set({
        sessionInfo: {
          participantId,
          designCode,
          startTime: Date.now(),
          isActive: true,
        },
      });
      get().logAction('session_started', {
        participantId,
        designCode,
        startTime: Date.now(),
      });
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

    updateItem: (id, updates) => set((state) => {
      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });
      
      return {
        items: state.items.map(item => 
          item.id === id ? { ...item, ...updates } : item
        ),
        undoStack: [...state.undoStack, currentStateStr],
        redoStack: [], // Clear redo stack on new action
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

    selectItem: (id) => set((state) => ({
      selectedItemId: id,
      items: state.items.map(item => ({
        ...item,
        isSelected: item.id === id,
      })),
    })),

    duplicateItem: (id) => set((state) => {
      const itemToDuplicate = state.items.find(item => item.id === id);
      if (!itemToDuplicate) return state;

      // Save current state for undo
      const currentStateStr = JSON.stringify({
        items: state.items,
        selectedItemId: state.selectedItemId,
        colorSelection: state.colorSelection,
        jacketConfig: state.jacketConfig,
      });

      const duplicatedItem: WearableItem = {
        ...itemToDuplicate,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: itemToDuplicate.position.x + 20,
          y: itemToDuplicate.position.y + 20,
        },
        isSelected: false,
      };

      return {
        items: [...state.items, duplicatedItem],
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
      const maxZIndex = Math.max(...state.items.map(item => item.zIndex || 0));
      return {
        items: state.items.map(item =>
          item.id === id ? { ...item, zIndex: maxZIndex + 1 } : item
        ),
      };
    }),

    moveItemToBack: (id) => set((state) => {
      const minZIndex = Math.min(...state.items.map(item => item.zIndex || 0));
      return {
        items: state.items.map(item =>
          item.id === id ? { ...item, zIndex: minZIndex - 1 } : item
        ),
      };
    }),

    updateColorSelection: (colorSelection) => set((state) => ({
      colorSelection: { ...state.colorSelection, ...colorSelection },
    })),

    updateJacketConfig: (config) => set((state) => ({
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
  }))
);

// Auto-save state changes
useAppStore.subscribe((state) => {
  state.saveState();
});
