localStorage.removeItem('asw-gui-state');

import { useState, useEffect, useCallback } from 'react';
import Slider from 'rc-slider';
import { useAppStore } from './store/appStore';
import { ColorPicker } from './components/ColorPicker';
import { JacketCanvas } from './components/JacketCanvas';
import { ItemControlPanel } from './components/ItemControlPanel';
import { JacketColorPicker } from './components/JacketColorPicker';
import { WelcomePopup } from './components/WelcomePopup';
import { WaitPopup } from './components/WaitPopup';
import { ConfirmationPopup } from './components/ConfirmationPopup';
import { CreateItemPopup } from './components/CreateItemPopup';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useColorSelection } from './hooks/useColorSelection';
import './main.css';
import 'rc-slider/assets/index.css';
import html2canvas from 'html2canvas';
import { uploadDesign } from './utils/uploadDesign';
import { updateShade } from './utils/colorUtils';
import type { WearableItem, JacketConfig, SessionInfo, ActionLog } from './types';
import { Button } from './components/Button';
import { InfoPopup } from './components/InfoPopup';
import { ScaleControls } from './components/ScaleControls';

function App() {
  const { 
    loadState, 
    jacketConfig, 
    updateJacketConfig, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    selectedItemId, 
    duplicateItem, 
    deleteSelectedItem,
    sessionInfo,
    startSession,
    endSession,
    items,
    actionLogs,
    moveItemToFront,
    moveItemToBack,
    moveMultipleItems,
    logAction,
    clearSelection,
    updateJacketConfig2,
    waitPopupShown
  } = useAppStore();
  const { updateItemConfiguration, createItem } = useDragAndDrop();
  const { colorSelection } = useColorSelection();
  const [jacketImage, setJacketImage] = useState<HTMLImageElement | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showCreateItemPopup, setShowCreateItemPopup] = useState(false);
  const [pendingItemType, setPendingItemType] = useState<string | null>(null);
  const [pendingDropPosition, setPendingDropPosition] = useState<{x: number, y: number} | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showWaitPopup, setShowWaitPopup] = useState(false);
  const [finalizeSubmission, setFinalizeSubmission] = useState(false);

  // Handle drag start for items
  const handleDragStart = useCallback((e: React.DragEvent, itemType: string) => {
    e.dataTransfer.setData('application/item-type', itemType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle view toggle
  const toggleView = () => {
    const newView = jacketConfig.view === 'front' ? 'back' : 'front';
    updateJacketConfig2({ view: newView });
    logAction('switched_jacket_view', { view: newView });
  };

  // Handle duplicate
  const handleDuplicate = () => {
    const selectedItems = items.filter(item => item.isSelected);
    if (selectedItems.length > 0) {
      duplicateItem(selectedItems[0].id);
      logAction('duplicated_items', { 
        count: selectedItems.length, 
        itemIds: selectedItems.map(item => item.id) 
      });
    } else if (selectedItemId) {
      duplicateItem(selectedItemId);
      logAction('duplicated_item', { itemId: selectedItemId });
    }
  };

  // Handle delete
  const handleDelete = () => {
    // Get all selected items
    const selectedItems = items.filter(item => item.isSelected);
    
    if (selectedItems.length > 0) {
      console.log('DELETE BUTTON: Deleting', selectedItems.length, 'items:', selectedItems.map(item => item.id));
      selectedItems.forEach(item => {
        // Use the store's removeItem function for each selected item
        const removeItem = useAppStore.getState().removeItem;
        removeItem(item.id);
      });
      logAction('deleted_items', { 
        count: selectedItems.length, 
        itemIds: selectedItems.map(item => item.id) 
      });
      console.log('DELETE BUTTON COMPLETE: Deleted', selectedItems.length, 'items');
    } else if (selectedItemId) {
      // Fallback to single item deletion
      deleteSelectedItem();
      logAction('deleted_item', { itemId: selectedItemId });
    }
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  // Check if any items are selected (for button states)
  const hasSelectedItems = items.some(item => item.isSelected) || !!selectedItemId;

  // Load static images on component mount
  useEffect(() => {
    console.log('Loading jacket images...');
    
    // Load saved state
    loadState();
    setTimeout(() => {
      const state = useAppStore.getState();
      const existingDefaults = state.items.filter(i => i.locked && i.type === 'light-strip');
      if (existingDefaults.length === 0) {
        const createLockedStrip = (view: 'front' | 'back', x: number, y: number, amount: number, length: number, size: number, rotation: number) => {
          const strip = state.items.length;
          const newItem: WearableItem = {
            id: `light-strip_DEFAULT_${view}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            type: 'light-strip',
            position: { x, y },
            color: 'rgb(227, 227, 227)',
            gradient: 5,
            movement: 'static',
            speed: 3,
            amount: amount,
            length: length,
            isSelected: false,
            isFlashing: false,
            view,
            zIndex: strip + 1,
            rotation: rotation,
            size: size,
            locked: true,
          };
          state.addItem(newItem);
        };
        createLockedStrip('front', 60, 130, 12, 1.7, 1, 4);
        createLockedStrip('front', 405, 130, 12, 1.7, 1, -4);
        createLockedStrip('front', 45, 470, 5, 0.3, 0.7, 95);
        createLockedStrip('front', 410, 473, 5, 0.3, 0.7, -95);
        const hasLockedBattery = state.items.some(i => i.type === 'battery' && i.locked);
        if (!hasLockedBattery) {
          const newBattery: WearableItem = {
            id: `battery_DEFAULT_front_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            type: 'battery',
            position: { x: 310, y: 160 },
            color: '#4CAF50',
            gradient: 5,
            movement: 'static',
            speed: 3,
            isSelected: false,
            isFlashing: false,
            view: 'front',
            zIndex: state.items.length + 1,
            rotation: 0,
            locked: true,
          };
          state.addItem(newBattery);
        }
      }
    }, 0);
  }, [loadState]);

  // Load jacket image when view changes
  useEffect(() => {
    console.log('Loading jacket image for view:', jacketConfig.view);
    
    const jacket = new Image();
    jacket.onload = () => {
      console.log('Jacket image loaded');
      setJacketImage(jacket);
    };
    jacket.onerror = (e) => console.error('Failed to load jacket image:', e);
    const jacketSrc = jacketConfig.view === 'front' ? '/jacketfront.png' : '/jacketback.png';
    jacket.src = jacketSrc;
  }, [jacketConfig.view]);

  // Handle session start
  const handleSessionStart = (participantId: string, designCode: string) => {
    startSession(participantId, designCode);
  };

  // Handle info button click to show instructions again
  const handleInfoClick = () => {
    endSession();
  };

  // Update the submit handlers
  const handleSubmitDesign = () => {
    if (!sessionInfo.participantId || !sessionInfo.designCode) {
      alert('Please enter participant ID and design code first.');
      return;
    }
    
    if (finalizeSubmission) {
      setShowSubmitConfirmation(true);
    } else {
      waitPopupShown();
      setShowWaitPopup(true);
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      // Generate CSVs
      const csvData = generateDesignCSV(items, jacketConfig, sessionInfo);
      const keystrokeData = generateKeystrokeCSV(actionLogs, items);

      // Render PNGs for both views
      const origView = jacketConfig.view;
      const guiImage1 = await renderJacketView('front', updateJacketConfig2);
      const guiImage2 = await renderJacketView('back', updateJacketConfig2);
      updateJacketConfig2({ view: origView }); // Restore original view

      // Create form data
      const formData = new FormData();
      formData.append("participant_num", sessionInfo.participantId);
      formData.append("video_num", sessionInfo.designCode);
      
      // Add CSV files
      const csvBlob = new Blob([csvData], { type: "text/csv" });
      const csvFile = new File([csvBlob], `Participant_${sessionInfo.participantId}_Design_${sessionInfo.designCode}.csv`, { type: "text/csv" });
      formData.append("csv_file", csvFile);

      const keystrokeBlob = new Blob([keystrokeData], { type: "text/csv" });
      const keystrokeFile = new File([keystrokeBlob], `KEYSTROKES_Participant_${sessionInfo.participantId}_Design_${sessionInfo.designCode}.csv`, { type: "text/csv" });
      formData.append("keystroke_file", keystrokeFile);

      // Add images
      formData.append("gui_image1", guiImage1, 'front.png');
      formData.append("gui_image2", guiImage2, 'back.png');

      // Submit to server
      const response = await fetch("http://localhost:3000/upload-csv", {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      if (result.message) {
        //alert(result.message);
        // Disable submit button
        const submitButton = document.getElementById('save-button');
        if (submitButton) {
          submitButton.style.opacity = '0.5';
          submitButton.setAttribute('disabled', 'true');
        }
        setTimeout(() => {
          window.location.reload();
        }, 200);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error submitting design:', err);
      const error = err as Error;
      setTimeout(() => {
        window.location.reload();
      }, 200);
      //alert(`Failed to submit design: ${error.message || 'Unknown error'}`);
    } finally {
      setShowSubmitConfirmation(false);
      setFinalizeSubmission(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false);
    setFinalizeSubmission(false);
  };

  // Handle create item button click
  const handleCreateItemClick = (itemType: string) => {
    setPendingItemType(itemType);
    setShowCreateItemPopup(true);
  };

  // Handle save from popup
  const handleSaveNewItem = useCallback((name: string, desc: string) => {
    if (pendingItemType && pendingDropPosition) {
      createItem('other', pendingDropPosition, name, desc);
    }
    setShowCreateItemPopup(false);
    setPendingItemType(null);
    setPendingDropPosition(null);
  }, [createItem, pendingItemType, pendingDropPosition]);

  // Handle drop for canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const itemType = e.dataTransfer.getData('application/item-type');
    if (!itemType) return;
    
    const rect = document.getElementById('jacketbox')?.getBoundingClientRect();
    if (!rect) return;
    
    const bounds = { width: 40, height: 30 };
    const x = e.clientX - rect.left - (bounds.width / 2);
    const y = e.clientY - rect.top - (bounds.height / 2);
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      if (itemType === 'other') {
        setPendingItemType('other');
        setShowCreateItemPopup(true);
        setPendingDropPosition({ x, y });
      } else {
        createItem(itemType as WearableItem['type'], { x, y });
      }
    }
  }, [createItem]);

  const handleCustomInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedItemId) {
      updateItemConfiguration(selectedItemId, { customInput: e.target.value });
    }
  }, [selectedItemId, updateItemConfiguration]);

  const handleSaveItem = () => {
    const deselectItem = useAppStore.getState().deselectItem;
    if (selectedItemId) {
      deselectItem(selectedItemId);
    }
  };

  // Helper: Serialize items to legacy CSV format
  function generateDesignCSV(items: WearableItem[], jacketConfig: JacketConfig, sessionInfo: SessionInfo, cloneStamp?: number): string {
    const stamp = cloneStamp ?? Date.now();
    let csv = 'Jacket Side,Item ID,Customization,Speed,Created Item Name,User Input,Color,Rotation,Size,Amount,Length,Width,X Position,Y Position\n';
    const cloneCounters: { [key: string]: number } = {};
    const addRow = (item: WearableItem) => {
      let cloneId = item.id;
      if (item.id.includes('_CLONED_')) {
        const itemType = item.id.split('_CLONED_')[0];
        cloneCounters[itemType] = (cloneCounters[itemType] || 0) + 1;
        cloneId = `${itemType}_CLONED_${stamp}_${cloneCounters[itemType]}`;
      }
      const lengthValue = (
        item.type === 'light-strip' ? (item.length || 1) :
        item.type === 'fur-patch' ? (item.verticalRows || '') :
        item.type === 'inflatable' ? (item.inflatableLength || '') :
        ''
      );
      const widthValue = (
        item.type === 'fur-patch' ? (item.amount || '') :
        item.type === 'inflatable' ? (item.inflatableWidth || '') :
        ''
      );

      const createdItemName = item.type === 'other' ? (item.customName || '') : '';
      csv += [
        item.view,
        cloneId,
        item.movement || '',
        item.speed || '', // Use per-item speed
        `"${createdItemName.replace(/"/g, '""')}"`,
        (item as any).customInput || '',
        `"${item.color || ''}"`,
        item.rotation || 0,
        item.size || 1,
        item.amount || '',
        lengthValue,
        widthValue,
        item.position.x,
        item.position.y
      ].join(',') + '\n';
    };
    items.forEach(addRow);
    // Add jacket color and total time if available
    if (jacketConfig.color) {
      const baseColor = { r: jacketConfig.color.r, g: jacketConfig.color.g, b: jacketConfig.color.b, a: 1 };
      const adjustedColor = updateShade(baseColor, jacketConfig.gradient ?? 5);
      csv += `"JACKET COLOR: ${adjustedColor}"`;
    }
    /*if (sessionInfo.startTime) {
      const totalTime = Math.round((Date.now() - sessionInfo.startTime) / 1000);
      csv += `\nTOTAL TIME: ${totalTime}`;
    }*/
    if (sessionInfo.startTime && sessionInfo.waitPopupTime) {
      const designTime = Math.round((sessionInfo.waitPopupTime - sessionInfo.startTime) / 1000);
      csv += `\nTOTAL TIME: ${designTime}`;
    }
    return csv;
  }

  // Helper: Serialize action logs to legacy keystroke CSV
  function generateKeystrokeCSV(actionLogs: ActionLog[], itemsForLookup: WearableItem[], cloneStamp?: number): string {
    const stamp = cloneStamp ?? Date.now();
    const cloneCounters: { [key: string]: number } = {};
    const idToEmitted: Record<string, string> = {};
    itemsForLookup.forEach(it => {
      let emitted = it.id;
      if (it.id.includes('_CLONED_')) {
        const itemType = it.id.split('_CLONED_')[0];
        cloneCounters[itemType] = (cloneCounters[itemType] || 0) + 1;
        emitted = `${itemType}_CLONED_${stamp}_${cloneCounters[itemType]}`;
      }
      idToEmitted[it.id] = emitted;
    });
    const formatId = (id: string): string => idToEmitted[id] || id;
    let csv = 'Timestamp,Action,Info\n';
    actionLogs.forEach((log: ActionLog) => {
      const data: any = log.data ? { ...log.data } : {};
      if (typeof data.itemId === 'string') data.itemId = formatId(data.itemId);
      if (typeof data.itemID === 'string') data.itemID = formatId(data.itemID);
      if (Array.isArray(data.itemIds)) data.itemIds = data.itemIds.map((id: string) => formatId(id));
      if (Array.isArray(data.allItemPositions)) {
        data.allItemPositions = data.allItemPositions.map((p: any) => ({
          ...p,
          itemId: typeof p.itemId === 'string' ? formatId(p.itemId) : p.itemId
        }));
      }
      csv += `${log.timestamp},${log.type},"${JSON.stringify(data).replace(/"/g, '""')}"\n`;
    });
    return csv;
  }

  // Helper: Render a view to PNG blob
  async function renderJacketView(view: 'front' | 'back', setView: (v: Partial<JacketConfig>) => void): Promise<Blob> {
    // Change view and wait for render
    setView({ view });
    await new Promise(r => setTimeout(r, 500)); // Increased wait time for render

    const jacketBox = document.getElementById('jacketbox');
    if (!jacketBox) throw new Error('Jacket box not found');

    try {
      const canvas = await html2canvas(jacketBox, {
        backgroundColor: null,
        logging: true,
        useCORS: true,
        allowTaint: true,
        scale: 1
      });

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/png',
          1.0
        );
      });
    } catch (error) {
      console.error('Error rendering view:', error);
      throw error;
    }
  }

  // Show or hide color wheel for selected item
  const showColorWheel = (() => {
    if (!selectedItemId) return false;
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) return false;
    if (selectedItem.type === 'speaker' || selectedItem.id?.startsWith('speaker')) return false;
    if (
      selectedItem.type === 'fur-patch' || selectedItem.id?.startsWith('fur-patch') ||
      selectedItem.type === 'battery' || selectedItem.id?.startsWith('battery')
    ) return true;
    return true;
  })();

  const renderBatteryBars = (numBars = 3) => {
    return Array.from({ length: numBars }, (_, i) => (
      <div key={i} className="battery-bar" />
    ));
  };

  return (
    <div className="app">
      {!sessionInfo.isActive && (
        <WelcomePopup isVisible={!sessionInfo.isActive} onContinue={handleSessionStart} />
      )}
      <div className="title-container">
        <h1 id="title">Wearable Design</h1>
        <button id="info-button" onClick={() => setShowInfoPopup(true)}>?</button>
      </div>
      <div className="container">
        <div className="sidebar">
          <h3 className="sidebar-title" style={{color: 'white'}}>Item Selection Area</h3>
          <div className="option">
            <div className="option-txt">Create Item</div>
            <div className="item-container" id="other-cont">
              <div 
                className="other" 
                id="other" 
                draggable="true" 
                onDragStart={(e) => handleDragStart(e, 'other')}
                data-name="?"
              ></div>
            </div>
          </div>
          
          <div className="option">Fur Patch
            <div className="item-container" id="fur-patch-cont">
              <div className="fur-patch" id="fur-patch" draggable="true" onDragStart={(e) => handleDragStart(e, 'fur-patch')}>
                {/* Back row */}
                <div className="fur1" style={{width: '12px', height: '18px', top: '0px', left: '16px', transform: 'rotate(-5deg)'}}></div>
                <div className="fur2" style={{width: '11px', height: '17px', top: '1px', left: '22px', transform: 'rotate(8deg)'}}></div>
                <div className="fur1" style={{width: '11px', height: '17px', top: '1px', left: '12px', transform: 'rotate(-12deg)'}}></div>
                {/* Middle row */}
                <div className="fur1" style={{width: '10px', height: '15px', top: '8px', left: '8px', transform: 'rotate(-20deg)'}}></div>
                <div className="fur2" style={{width: '10px', height: '15px', top: '8px', left: '14px', transform: 'rotate(-15deg)'}}></div>
                <div className="fur1" style={{width: '10px', height: '15px', top: '8px', left: '26px', transform: 'rotate(15deg)'}}></div>
                <div className="fur2" style={{width: '10px', height: '15px', top: '8px', left: '30px', transform: 'rotate(22deg)'}}></div>
                {/* Front row */}
                <div className="fur1" style={{width: '9px', height: '13px', top: '15px', left: '18px', transform: 'rotate(-3deg)'}}></div>
                <div className="fur2" style={{width: '9px', height: '13px', top: '15px', left: '20px', transform: 'rotate(10deg)'}}></div>
                {/* Side fill */}
                <div className="fur1" style={{width: '8px', height: '14px', top: '12px', left: '4px', transform: 'rotate(-25deg)'}}></div>
                <div className="fur2" style={{width: '8px', height: '14px', top: '12px', left: '34px', transform: 'rotate(25deg)'}}></div>
                {/* Back fill */}
                <div className="fur1" style={{width: '10px', height: '16px', top: '3px', left: '16px', transform: 'rotate(-8deg)'}}></div>
                <div className="fur2" style={{width: '10px', height: '16px', top: '3px', left: '24px', transform: 'rotate(5deg)'}}></div>
                {/* Front fill */}
                <div className="fur1" style={{width: '8px', height: '12px', top: '18px', left: '10px', transform: 'rotate(-18deg)'}}></div>
                <div className="fur2" style={{width: '8px', height: '12px', top: '18px', left: '28px', transform: 'rotate(18deg)'}}></div>
              </div>
            </div>
          </div>
          
          <div className="option">
            <div className="option-txt">Individual Light</div>
            <div className="item-container" id="light-ind-cont">
              <div className="light-ind" id="light-ind" draggable="true" onDragStart={(e) => handleDragStart(e, 'light-ind')}></div>
            </div>
          </div>
          
          <div className="option">Light Strip
            <div className="item-container" id="light-strip-cont">
              <div className="light-strip" id="light-strip" draggable="true" onDragStart={(e) => handleDragStart(e, 'light-strip')}>
                <div className="rectangle"></div>
                <div className="circle" style={{top: '-3px'}}></div>
                <div className="circle" style={{top: '37px'}}></div>
                <div className="circle" style={{top: '77px'}}></div>
                <div className="circle" style={{top: '117px'}}></div>
                <div className="circle" style={{top: '157px'}}></div>
                <div className="circle" style={{top: '195px'}}></div>
              </div>
            </div>
          </div>

          <div className="option">Inflatable
            <div className="item-container" id="inflatable-cont">
              <div className="inflatable" draggable="true" onDragStart={(e) => handleDragStart(e, 'inflatable')}/>
            </div>
          </div>
          
          <div className="option">
            <div className="option-txt">Social Battery Display</div>
            <div className="item-container" id="battery-cont">
              <div className="battery" id="battery" draggable="true" onDragStart={(e) => handleDragStart(e, 'battery')}>
                <div className="battery1">
                  {renderBatteryBars(3)}
                </div>
                <div className="battery2"></div>
              </div>
            </div>
          </div>
          
          <div className="option">
            <div className="option-txt">Display Screen</div>
            <div className="item-container" id="display-cont">
              <div className="display" id="display" draggable="true" onDragStart={(e) => handleDragStart(e, 'display')}></div>
            </div>
          </div>
          
          <div className="option">Speaker
            <div className="item-container" id="speaker-cont">
              <div className="speaker" id="speaker" draggable="true" onDragStart={(e) => handleDragStart(e, 'speaker')}>
                <div className="speaker-body"></div>
                <div className="speaker-cone">
                  <div className="speaker-cone-shape"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="option">Scent
            <div className="item-container" id="scent-cont">
              <div className="scent" draggable="true" onDragStart={(e) => handleDragStart(e, 'scent')}/>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="session-info">
            <div className="session-item">Participant ID: {sessionInfo.participantId}</div>
            <div className="session-item">Design Code: {sessionInfo.designCode}</div>
          </div>
          <div className="design-area">
            <h2 className="design-area-title" style={{color: 'white'}}>Main Design Area</h2>
            <div className="jacketbox" id="jacketbox" onDrop={handleDrop} onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}>
            <JacketCanvas 
              jacketImage={jacketImage}
              setPendingItemType={setPendingItemType}
              setShowCreateItemPopup={setShowCreateItemPopup}
              setPendingDropPosition={setPendingDropPosition}
            />
            <button 
              id="back-view" 
              onClick={toggleView}
              style={{display: jacketConfig.view === 'front' ? 'block' : 'none'}}
            >
              Switch to Back
            </button>
            <button 
              id="front-view" 
              onClick={toggleView}
              style={{display: jacketConfig.view === 'back' ? 'block' : 'none'}}
            >
              Switch to Front
            </button>
          </div>
          </div>
        </div>

        <div className="customization">
          <h3 className="sidebar-title" style={{color: 'white'}}>Item Customization Area</h3>
          <div className="undoredodel">
            <div className="undoredo">
              <button 
                id="undo" 
                onClick={handleUndo}
                disabled={!canUndo()}
                style={{opacity: canUndo() ? 1 : 0.5}}
              >
                <img src="undo.png" id="undo-arrow" draggable="false" style={{display: 'block'}} />
              </button>
              <button 
                id="redo" 
                onClick={handleRedo}
                disabled={!canRedo()}
                style={{opacity: canRedo() ? 1 : 0.5}}
              >
                <img src="redo.png" id="redo-arrow" draggable="false" style={{display: 'block'}} />
              </button>
            </div>
            <button 
              id="duplicate" 
              onClick={handleDuplicate}
              disabled={!hasSelectedItems}
              style={{opacity: hasSelectedItems ? 1 : 0.5}}
            >
              Duplicate
            </button>
            <button 
              id="delete" 
              onClick={handleDelete}
              disabled={!hasSelectedItems}
              style={{opacity: hasSelectedItems ? 1 : 0.5}}
            >
              Delete
            </button>
          </div>

          {/* Multiple items move to front/back above jacket color wheel */}
          {items.filter(item => item.isSelected).length > 1 && (
            <>
              <div className="selection-indicator" style={{ marginTop: '15px', marginBottom: '15px' }}>
                <div className="selection-bar"></div>
                <span className="selection-text">Item Selected</span>
              </div>
              
              {/* Layer controls */}
              <div className="layer-controls" style={{ marginBottom: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  type="button"
                  onClick={() => {
                    const selectedItems = items.filter(item => item.isSelected);
                    if (selectedItems.length > 0) {
                      const firstItem = selectedItems[0];
                      const targetView = firstItem.view === 'front' ? 'back' : 'front';
                      moveMultipleItems(selectedItems.map(item => item.id), targetView);
                      selectedItems.forEach(item => {
                        if (targetView === 'front') {
                          logAction('moved_item_to_front', { itemId: item.id });
                        } else {
                          logAction('moved_item_to_back', { itemId: item.id });
                        }
                      });
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: '#4A9FBF',
                    border: 'none',
                    padding: '8px 16px',
                    fontSize: '14px',
                    color: 'white',
                    borderRadius: '4px'
                  }}
                >
                  {(() => {
                    const selectedItems = items.filter(item => item.isSelected);
                    if (selectedItems.length === 0) return 'Move to Back';
                    const firstItem = selectedItems[0];
                    return firstItem.view === 'front' ? 'Move to Back' : 'Move to Front';
                  })()}
                </button>
              </div>
            </>
          )}

          {!selectedItemId && (
            <div className="color-wheels-container">
              <div className="color-wheel-section">
                <div className="jacketcolor">
                  <div className="jacket-col-grid">
                    <JacketColorPicker />
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedItemId && (
              <>
                <div className="selection-indicator">
                  <div className="selection-bar"></div>
                  <span className="selection-text">Item Selected</span>
                </div>
                
                {/* Layer controls */}
                <div className="layer-controls" style={{ marginBottom: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      const selectedItem = items.find(item => item.id === selectedItemId);
                      if (selectedItem) {
                        if (selectedItem.view === 'front') {
                          moveItemToBack(selectedItem.id);
                          logAction('moved_item_to_back', { itemId: selectedItem.id });
                        } else {
                          moveItemToFront(selectedItem.id);
                          logAction('moved_item_to_front', { itemId: selectedItem.id });
                        }
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: '#4A9FBF',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    {items.find(item => item.id === selectedItemId)?.view === 'front' ? 'Move to Back' : 'Move to Front'}
                  </button>
                </div>
                
                {showColorWheel && (
                  <>
                    <div className="color-wheel-section">
                    <div className="color">
                      <h2 id="color-title">Color</h2>
                      <div className="color-grid" id="color-grid">
                        <ColorPicker />
                      </div>
                    </div>
                  </div>
                </>
              )}
              <ScaleControls itemId={selectedItemId} />
              
              {selectedItemId && (
                <>
                  <h2 id="movement-title" style={{ marginLeft: 80 }}>
                    {(() => {
                      const selectedItem = items.find(item => item.id === selectedItemId);
                      if (selectedItem) {
                        if (selectedItem.type === 'speaker') return 'Sound';
                        if (selectedItem.type === 'scent') return 'Scent';
                        if (selectedItem.type === 'display') return 'Display';
                        return 'Action';
                      }
                      return 'Action';
                    })()}
                  </h2>
                  <ItemControlPanel />
                </>
              )}
              
              {selectedItemId && (
                <div className="custom-user-input">
                  <h2 id="custom-title">
                    {items.find(item => item.id === selectedItemId)?.type === 'speaker' 
                      ? 'What should it play?' 
                      : items.find(item => item.id === selectedItemId)?.type === 'scent'
                        ? 'What should the scent be?'
                        : items.find(item => item.id === selectedItemId)?.type === 'display'
                          ? 'What should it display?'
                          : 'Write my own action:'}
                  </h2>
                  <textarea 
                    id="custom-input" 
                    name="item-movement" 
                    rows={2} 
                    cols={22}
                    value={items.find(item => item.id === selectedItemId)?.customInput || ''}
                    onChange={handleCustomInputChange}
                    placeholder={
                      items.find(item => item.id === selectedItemId)?.type === 'speaker' ? 'Write the sound it should play' : 'Write the desired action for this item'
                    }
                  ></textarea>
                </div>
              )}
              
              {(() => {
                const selectedItem = items.find(item => item.id === selectedItemId);
                if (!selectedItem || selectedItem.type === 'display' || selectedItem.type === 'scent') return null;
                
                return (
                  <div className="speed" style={{ marginTop: 20, marginBottom: 20 }}>
                    <h2 id="speed-title" style={{ marginLeft: 80 }}>
                      {selectedItem.type === 'battery' 
                        ? 'Battery Level' 
                        : selectedItem.type === 'speaker'
                          ? 'Volume'
                          : 'Speed'}
                    </h2>
                    <Slider
                      min={1}
                      max={5}
                      value={selectedItem.speed ?? 3}
                      onChange={value => {
                        const speed = Array.isArray(value) ? value[0] : value;
                        if (selectedItemId) {
                          updateItemConfiguration(selectedItemId, { speed });
                        }
                      }}
                      className="speed-slider"
                      trackStyle={[{ backgroundColor: 'var(--primary-blue)' }]}
                      handleStyle={[{
                        backgroundColor: 'var(--primary-blue)',
                        borderColor: 'var(--primary-blue)'
                      }]}
                    />
                  </div>
                );
              })()}
              </>
            )}
          
          {/* Synchronize Animations */}
          {(() => {
            const selectedItems = items.filter(item => item.isSelected);
            const selectedLightStrips = selectedItems.filter(item => 
              item.type === 'light-strip' || item.type === 'light-ind'
            );
            if (selectedLightStrips.length > 1) {
              return (
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const now = Date.now();
                      selectedLightStrips.forEach(item => {
                        updateItemConfiguration(item.id, { 
                          animationStartTime: now 
                        });
                      });
                      logAction('synchronized_animations', {
                        itemIds: selectedLightStrips.map(item => item.id)
                      });
                    }}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: '#4A9FBF',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    Synchronize Animations
                  </button>
                </div>
              );
            }
            return null;
          })()}
          
          <div className="save">
            {selectedItemId ? (
              <button 
                type="button" 
                id="save-item-button" 
                onClick={handleSaveItem}
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  backgroundColor: '#0077ff',
                  border: 'none',
                  padding: '14px',
                  fontSize: '15px',
                  color: 'white',
                  width: '60%',
                  marginTop: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                }}
              >
                Save Item
              </button>
            ) : (
              <button 
                type="button" 
                id="save-button" 
                onClick={handleSubmitDesign}
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  backgroundColor: '#0077ff',
                  border: 'none',
                  padding: '14px',
                  fontSize: '15px',
                  color: 'white',
                  width: '60%',
                  marginTop: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                }}
              >
                {finalizeSubmission ? 'Finalize Submission' : 'Submit Design'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wait popup */}
      <WaitPopup 
        isVisible={showWaitPopup}
        onOk={() => {
          setShowWaitPopup(false);
          setFinalizeSubmission(true);
        }}
        onCancel={() => setShowWaitPopup(false)}
      />

      {/* Confirmation popup */}
      <ConfirmationPopup 
        isVisible={showSubmitConfirmation} 
        title="Submit Design?"
        message="Are you sure you want to submit your design? This action cannot be undone."
        onConfirm={handleConfirmSubmit} 
        onCancel={handleCancelSubmit} 
      />

      <CreateItemPopup
        isVisible={showCreateItemPopup}
        onSave={handleSaveNewItem}
        onCancel={() => { setShowCreateItemPopup(false); setPendingItemType(null); }}
      />
      <InfoPopup 
        isVisible={showInfoPopup}
        onClose={() => setShowInfoPopup(false)}
      />
    </div>
  );
}

export default App;
