import React from 'react';

interface WaitPopupProps {
  isVisible: boolean;
  onOk: () => void;
  onCancel: () => void;
}

export const WaitPopup: React.FC<WaitPopupProps> = ({ isVisible, onOk, onCancel }) => {
  if (!isVisible) return null;
  return (
    <div 
      className="wait-popup-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
      <div 
        className="wait-popup"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '400px',
          textAlign: 'center',
          width: '90%',
        }}>
      {/*<div
        style={{
          width: '130px',
          height: '70px',
          backgroundColor: '#ffdd00',
          margin: '0 auto 20px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }}>
        <span
          style={{
            color: 'black',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
        Wait!
        </span>
      </div>*/}
      <p
        style={{
          margin: '0 0 25px 0',
          fontSize: '16px',
          color: '#333'
        }}>
        Please click Continue and explain your design to the experimenter.{/*Please make sure that you have explained your design to the experimenter.*/}
      </p>
      <div style={{
        display: 'flex',
        gap: '15px',
        justifyContent: 'center'
      }}>
        <button
          onClick={onOk}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#0077ff',
            fontSize: '14px',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          Continue{/*Ok*/}
        </button>
        {/*<button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          >
            Cancel
          </button>*/}
        </div>
      </div>
    </div>
  );
}; 

