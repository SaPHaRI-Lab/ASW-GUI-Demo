import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface CreateItemPopupProps {
  isVisible: boolean;
  onSave: (name: string, desc: string) => void;
  onCancel: () => void;
}

export const CreateItemPopup: React.FC<CreateItemPopupProps> = ({ isVisible, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  useEffect(() => {
    if (!isVisible || (isVisible && (name || desc))) {
      setName('');
      setDesc('');
    }
  }, [isVisible]);
  if (!isVisible) return null;
  const handleSave = () => {
    onSave(name, desc);
    setName('');
    setDesc('');
  };
  return (
    <div className="popup-overlay">
      <div className="popup-cyo2 modern">
        <h2 className="popup-title" id="cyo-title">New Item</h2>
        <div className="cyo-field">
          <label htmlFor="cyo-name" id="cyo-name-label">Item name:</label>
          <input
            type="text"
            id="cyo-name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="cyo-field">
          <label htmlFor="cyo-desc" id="cyo-desc-label">Description:</label>
          <input
            type="text"
            id="cyo-desc"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
        </div>
        <div className="cyo-buttons">
          <button className="btn primary" id="cyo-save" onClick={handleSave} disabled={!name.trim()}>
            Ok
          </button>
          <button className="btn secondary" id="cyo-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
