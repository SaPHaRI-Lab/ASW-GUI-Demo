import React from 'react';

interface InfoPopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export const InfoPopup: React.FC<InfoPopupProps> = ({ isVisible, onClose }) => {
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
        className="info-popup"
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
          Instructions
        </h2>
        <p style={{ 
          margin: '0',
          color: '#666',
          lineHeight: '1.5',
          fontSize: '14px'
        }}>
          Drag & drop features from the left sidebar onto the jacket image based on the video you have watched. From the right sidebar, you can make customizations and selections for various actuation methods. When you're done with your design, click the "Submit Design" button at the bottom right.
        </p>
      </div>
    </div>
  );
}; 