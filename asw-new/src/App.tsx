import { useState, useEffect } from 'react';
import Slider from 'rc-slider';
import { useAppStore } from './store/appStore';
import { ColorPicker } from './components/ColorPicker';
import { JacketCanvas } from './components/JacketCanvas';
import { ItemControlPanel } from './components/ItemControlPanel';
import { JacketColorPicker } from './components/JacketColorPicker';
import { WelcomePopup } from './components/WelcomePopup';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import './main.css';
import 'rc-slider/assets/index.css';

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
    endSession
  } = useAppStore();
  const { updateItemConfiguration } = useDragAndDrop();
  const [jacketImage, setJacketImage] = useState<HTMLImageElement | null>(null);

  // Handle drag start for items
  const handleDragStart = (e: React.DragEvent, itemType: string) => {
    console.log('Drag started for:', itemType);
    e.dataTransfer.setData('application/item-type', itemType);
    e.dataTransfer.effectAllowed = 'copy';
  };

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
    if (selectedItemId) {
      deleteSelectedItem();
    }
  };

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

  // Handle speed change with animation integration
  const handleSpeedChange = (value: number | number[]) => {
    const speed = Array.isArray(value) ? value[0] : value;
    
    if (selectedItemId) {
      // Update the selected item's speed, which affects animation timing
      updateItemConfiguration(selectedItemId, { speed: speed * 20 }); // Scale to 0-100 range
    }
  };

  // Handle session start
  const handleSessionStart = (participantId: string, designCode: string) => {
    startSession(participantId, designCode);
  };

  // Handle info button click to show instructions again
  const handleInfoClick = () => {
    endSession();
  };

  return (
    <div className="app">
      {!sessionInfo.isActive && (
        <WelcomePopup isVisible={!sessionInfo.isActive} onContinue={handleSessionStart} />
      )}
      
      <div className="title-container">
        <h1 id="title">Wearable Design</h1>
        <button id="info-button" onClick={handleInfoClick}>?</button>
      </div>
      
      <div className="container">
        <div className="sidebar">
          <div className="option">
            <div className="option-txt">Create Item</div>
            <div className="item-container" id="other-cont">
              <div className="other" id="other" draggable="true" onDragStart={(e) => handleDragStart(e, 'other')}></div>
            </div>
          </div>
          
          <div className="option">Fur Patch
            <div className="item-container" id="fur-patch-cont">
              <div className="fur-patch" id="fur-patch" draggable="true" onDragStart={(e) => handleDragStart(e, 'fur-patch')}>
                <div className="fur1" style={{top: '0px'}}></div>
                <div className="fur2" style={{top: '10px'}}></div>
                <div className="fur1" style={{top: '20px'}}></div>
                <div className="fur1" style={{top: '0px', left: '9px'}}></div>
                <div className="fur2" style={{top: '10px', left: '9px'}}></div>
                <div className="fur1" style={{top: '20px', left: '9px'}}></div>
                <div className="fur1" style={{top: '0px', left: '18px'}}></div>
                <div className="fur2" style={{top: '10px', left: '18px'}}></div>
                <div className="fur1" style={{top: '20px', left: '18px'}}></div>
                <div className="fur1" style={{top: '0px', left: '27px'}}></div>
                <div className="fur2" style={{top: '10px', left: '27px'}}></div>
                <div className="fur1" style={{top: '20px', left: '27px'}}></div>
                <div className="fur1" style={{top: '0px', left: '36px'}}></div>
                <div className="fur2" style={{top: '10px', left: '36px'}}></div>
                <div className="fur1" style={{top: '20px', left: '36px'}}></div>
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
                <div className="battery2"></div>
                <div className="battery1">
                  <div className="battery-bar" id="bar1"></div>
                  <div className="battery-bar" id="bar2"></div>
                  <div className="battery-bar" id="bar3"></div>
                  <div className="battery-bar" id="bar4"></div>
                  <div className="battery-bar" id="bar5"></div>
                </div>
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
                <div className="rectangle2"></div>
                <div className="trapezoid"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="session-info">
            <div className="session-item">Participant ID: {sessionInfo.participantId}</div>
            <div className="session-item">Design Code: {sessionInfo.designCode}</div>
          </div>
          <div className="jacketbox" id="jacketbox">
            <JacketCanvas jacketImage={jacketImage} />
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
              disabled={!selectedItemId}
              style={{opacity: selectedItemId ? 1 : 0.5}}
            >
              Duplicate
            </button>
            <button 
              id="delete" 
              onClick={handleDelete}
              disabled={!selectedItemId}
              style={{opacity: selectedItemId ? 1 : 0.5}}
            >
              Delete
            </button>
          </div>
          
          <div className="color-wheels-container">
            <div className="color-wheel-section">
              <div className="jacketcolor">
                <div className="jacket-col-grid">
                  <JacketColorPicker />
                </div>
              </div>
            </div>
            
            {selectedItemId && (
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
                  </div>
                </div>
              </>
            )}
          </div>
          
          {selectedItemId && (
            <>
              <div className="speed">
                <h2 id="speed-title">Speed</h2>
                <Slider
                  min={1}
                  max={5}
                  defaultValue={3}
                  onChange={handleSpeedChange}
                  className="speed-slider"
                  trackStyle={{ backgroundColor: 'var(--primary-blue)' }}
                  handleStyle={{ 
                    backgroundColor: 'var(--primary-blue)',
                    borderColor: 'var(--primary-blue)'
                  }}
                />
                <p><span id="value" style={{display: 'none'}}></span></p>
              </div>
              
              <h2 id="movement-title">Action</h2>
              <ItemControlPanel />
              
              <div className="custom-user-input">
                <h2 id="custom-title">Write my own:</h2>
                <textarea id="custom-input" name="item-movement" rows={2} cols={22}></textarea>
              </div>
            </>
          )}
          
          <div className="save">
            <button type="button" id="save-button">Submit Design</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
