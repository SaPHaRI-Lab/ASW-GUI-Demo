import React from 'react';

interface ColorInfoPopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ColorInfoPopup: React.FC<ColorInfoPopupProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  return (
    <div 
      className="info-popup-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '100px',
        zIndex: 1000
      }}
    >
      <div 
        className="color-info-popup"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px',
            border: 'none',
            background: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>
        <h2 style={{ 
          margin: '0 0 16px 0',
          color: '#333',
          fontSize: '20px'
        }}>
          Color Copy & Paste
        </h2>
        <p style={{ 
          margin: '0',
          color: '#666',
          lineHeight: '1.5',
          fontSize: '14px'
        }}>
          Click the "Copy" button to copy the currently selected color. Click the "Paste" button to paste the copied color to an item or the jacket.
        </p>
      </div>
    </div>
  );
}; 