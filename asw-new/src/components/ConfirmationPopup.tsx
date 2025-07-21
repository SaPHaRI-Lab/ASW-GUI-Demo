import React from 'react';
import { Button } from './Button';

interface ConfirmationPopupProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
  isVisible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isVisible) return null;

  return (
    <div className="popup-overlay">
      <div className="confirmation-popup">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirmation-buttons">
          <Button 
            variant="primary" 
            onClick={onConfirm}
            className="confirm-button"
          >
            {confirmText}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onCancel}
            className="cancel-button"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
};
