localStorage.removeItem('asw-gui-state');

import { useState, useEffect, useCallback } from 'react';
import Slider from 'rc-slider';
import { useAppStore } from './store/appStore';
import { ColorPicker } from './components/ColorPicker';
import { JacketCanvas } from './components/JacketCanvas';
import { ItemControlPanel } from './components/ItemControlPanel';
import { JacketColorPicker } from './components/JacketColorPicker';
import { WelcomePopup } from './components/WelcomePopup';
import { ConfirmationPopup } from './components/ConfirmationPopup';
import { CreateItemPopup } from './components/CreateItemPopup';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useColorSelection } from './hooks/useColorSelection';
import './main.css';
import 'rc-slider/assets/index.css';
import html2canvas from 'html2canvas';
import { uploadDesign } from './utils/uploadDesign';
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
    actionLogs
  } = useAppStore();
  const { updateItemConfiguration, createItem } = useDragAndDrop();
  const { colorSelection, handleBrightnessChange } = useColorSelection();
  const [jacketImage, setJacketImage] = useState<HTMLImageElement | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showCreateItemPopup, setShowCreateItemPopup] = useState(false);
  const [pendingItemType, setPendingItemType] = useState<string | null>(null);
  const [pendingDropPosition, setPendingDropPosition] = useState<{x: number, y: number} | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  // Handle drag start for items
  const handleDragStart = useCallback((e: React.DragEvent, itemType: string) => {
    e.dataTransfer.setData('application/item-type', itemType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle view toggle
  const toggleView = () => {
    const newView = jacketConfig.view === 'front' ? 'back' : 'front';
    updateJacketConfig({ view: newView });
  };

  // Handle duplicate
  const handleDuplicate = () => {
    if (selectedItemId) {
      duplicateItem(selectedItemId);
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
      console.log('DELETE BUTTON COMPLETE: Deleted', selectedItems.length, 'items');
    } else if (selectedItemId) {
      // Fallback to single item deletion
      deleteSelectedItem();
    }
  };

  // Check if any items are selected (for button states)
  const hasSelectedItems = items.some(item => item.isSelected) || !!selectedItemId;

  // Load static images on component mount
  useEffect(() => {
    console.log('Loading jacket images...');
    
    // Load saved state
    loadState();
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
    setShowSubmitConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      // Generate CSVs
      const csvData = generateDesignCSV(items, jacketConfig, sessionInfo);
      const keystrokeData = generateKeystrokeCSV(actionLogs);

      // Render PNGs for both views
      const origView = jacketConfig.view;
      const guiImage1 = await renderJacketView('front', updateJacketConfig);
      const guiImage2 = await renderJacketView('back', updateJacketConfig);
      updateJacketConfig({ view: origView }); // Restore original view

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
        alert(result.message);
        // Disable submit button
        const submitButton = document.getElementById('save-button');
        if (submitButton) {
          submitButton.style.opacity = '0.5';
          submitButton.setAttribute('disabled', 'true');
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error submitting design:', err);
      const error = err as Error;
      alert(`Failed to submit design: ${error.message || 'Unknown error'}`);
    } finally {
      setShowSubmitConfirmation(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false);
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
  function generateDesignCSV(items: WearableItem[], jacketConfig: JacketConfig, sessionInfo: SessionInfo): string {
    let csv = 'Jacket Side,Item ID,Customization,Speed,User Input,Color,Rotation,Scale,X Position,Y Position\n';
    const addRow = (item: WearableItem) => {
      csv += [
        item.view,
        item.id,
        item.movement || '',
        item.speed || '', // Use per-item speed
        (item as any).customInput || '',
        item.color || '',
        item.rotation || 0,
        1, // scale (not implemented, default 1)
        item.position.x,
        item.position.y
      ].join(',') + '\n';
    };
    items.forEach(addRow);
    // Add jacket color and total time if available
    if (jacketConfig.color) {
      csv += `JACKET COLOR: rgb(${jacketConfig.color.r},${jacketConfig.color.g},${jacketConfig.color.b})`;
    }
    if (sessionInfo.startTime) {
      const totalTime = Math.round((Date.now() - sessionInfo.startTime) / 1000);
      csv += `\nTOTAL TIME: ${totalTime}`;
    }
    return csv;
  }

  // Helper: Serialize action logs to legacy keystroke CSV
  function generateKeystrokeCSV(actionLogs: ActionLog[]): string {
    let csv = 'Timestamp,Action,Info\n';
    actionLogs.forEach((log: ActionLog) => {
      csv += `${log.timestamp},${log.type},"${JSON.stringify(log.data).replace(/"/g, '""')}"\n`;
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
  const showGradientSlider = showColorWheel;

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
        </div>

        <div className="box">
          <div className="session-info">
            <div className="session-item">Participant ID: {sessionInfo.participantId}</div>
            <div className="session-item">Design Code: {sessionInfo.designCode}</div>
          </div>
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

        <div className="customization">
          <div className="undoredodel">
            <div className="undoredo">
              <button 
                id="undo" 
                onClick={undo}
                disabled={!canUndo()}
                style={{opacity: canUndo() ? 1 : 0.5}}
              >
                <img src="undo.png" id="undo-arrow" draggable="false" style={{display: 'block'}} />
              </button>
              <button 
                id="redo" 
                onClick={redo}
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
              {showColorWheel && (
                <>
                  <div className="selection-indicator">
                    <div className="selection-bar"></div>
                    <span className="selection-text">Item Selected</span>
                  </div>
                  
                  <div className="color-wheel-section">
                    <div className="color">
                      <h2 id="color-title">Color</h2>
                      <div className="color-grid" id="color-grid">
                        <ColorPicker />
                      </div>
                      {showGradientSlider && (
                        <div className="gradient-control" style={{marginTop: '10px'}}>
                          <label htmlFor="gradient-slider">Gradient</label>
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
                      )}
                    </div>
                  </div>
                </>
              )}

              {items.find(item => item.id === selectedItemId)?.type !== 'display' && (
                <div className="speed" style={{ marginTop: 20, marginBottom: 20 }}>
                  <h2 id="speed-title">
                    {items.find(item => item.id === selectedItemId)?.type === 'battery' 
                      ? 'Battery Level' 
                      : items.find(item => item.id === selectedItemId)?.type === 'speaker'
                        ? 'Volume'
                        : 'Speed'}
                  </h2>
                  <Slider
                    min={1}
                    max={5}
                    value={items.find(item => item.id === selectedItemId)?.speed ?? 3}
                    onChange={value => {
                      const speed = Array.isArray(value) ? value[0] : value;
                      updateItemConfiguration(selectedItemId, { speed });
                    }}
                    className="speed-slider"
                    trackStyle={[{ backgroundColor: 'var(--primary-blue)' }]}
                    handleStyle={[{
                      backgroundColor: 'var(--primary-blue)',
                      borderColor: 'var(--primary-blue)'
                    }]}
                  />
                </div>
              )}
              <ScaleControls itemId={selectedItemId} />
              <h2 id="movement-title">
                {items.find(item => item.id === selectedItemId)?.type === 'speaker' ? 'Sound' : 'Action'}
              </h2>
              <ItemControlPanel />
              <div className="custom-user-input">
                <h2 id="custom-title">
                  {items.find(item => item.id === selectedItemId)?.type === 'speaker' 
                    ? 'What should it play?' 
                    : 'Write my own action:'}
                </h2>
                <textarea 
                  id="custom-input" 
                  name="item-movement" 
                  rows={2} 
                  cols={22}
                  value={items.find(item => item.id === selectedItemId)?.customInput || ''}
                  onChange={handleCustomInputChange}
                ></textarea>
              </div>
            </>
          )}
          
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
                  width: '40%',
                  marginTop: '35px',
                  marginLeft: '15px',
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
                  width: '40%',
                  marginTop: '35px',
                  marginLeft: '15px',
                  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                }}
              >
                Submit Design
              </button>
            )}
          </div>
        </div>
      </div>

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
