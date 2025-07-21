import React, { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';

interface WelcomePopupProps {
  isVisible: boolean;
  onContinue: (participantId: string, designCode: string) => void;
}

export const WelcomePopup: React.FC<WelcomePopupProps> = ({ isVisible, onContinue }) => {
  const [participantId, setParticipantId] = useState('');
  const [designCode, setDesignCode] = useState('');
  const { logAction } = useAppStore();

  const handleContinue = useCallback(() => {
    if (participantId.trim() && designCode.trim()) {
      logAction('session_started', {
        participantId: participantId.trim(),
        designCode: designCode.trim(),
        timestamp: Date.now()
      });
      onContinue(participantId.trim(), designCode.trim());
    }
  }, [participantId, designCode, onContinue, logAction]);

  const isFormValid = participantId.trim() !== '' && designCode.trim() !== '';

  if (!isVisible) {
    return null;
  }

  return (
    <div className="welcome-popup">
      <div className="popup-instructions">
        <h1 className="popup-title">Instructions</h1>
        <p className="popup-text">
          <br />
          Welcome to the Affect-Sensing Wearable graphical user interface (GUI).
          <br />
          <br />
          Please drag & drop features from the left sidebar onto the jacket image based on the video you have watched. 
          From the right sidebar, you can make customizations and selections for various actuation methods. 
          When you're done with your design, click the "Submit Design" button at the bottom right.
          <br />
          <br />
          Please enter your participant number and design code below:
          <br />
        </p>
        
        <div className="popup-identifiers">
          <div className="input-group">
            <label htmlFor="participant-input" className="input-label">Participant #:</label>
            <input 
              type="text" 
              id="participant-input"
              className="popup-input"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Enter participant number"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="design-code-input" className="input-label">Design Code:</label>
            <input 
              type="text" 
              id="design-code-input"
              className="popup-input"
              value={designCode}
              onChange={(e) => setDesignCode(e.target.value)}
              placeholder="Enter design code"
            />
          </div>
        </div>
        
        <button 
          className={`continue-button ${isFormValid ? 'enabled' : 'disabled'}`}
          disabled={!isFormValid}
          onClick={handleContinue}
        >
          Begin
        </button>
      </div>
    </div>
  );
};
