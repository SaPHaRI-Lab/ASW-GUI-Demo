import React from 'react';

interface RightClickMenuProps {
  position: { x: number; y: number };
  onItemSelect: (itemType: string) => void;
  onClose: () => void;
}

export const RightClickMenu: React.FC<RightClickMenuProps> = ({ position, onItemSelect, onClose }) => {
  const items = [
    { id: 'fur-patch', label: 'Fur Patch' },
    { id: 'light-ind', label: 'Individual Light' },
    { id: 'light-strip', label: 'Light Strip' },
    { id: 'battery', label: 'Social Battery Display' },
    { id: 'display', label: 'Display Screen' },
    { id: 'speaker', label: 'Speaker' },
    { id: 'other', label: 'Other' }
  ];

  return (
    <>
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 14
        }} 
        onClick={onClose}
      />
      <div 
        className="click-create"
        style={{
          display: 'grid',
          position: 'absolute',
          left: position.x,
          top: position.y,
          backgroundColor: 'rgb(228, 228, 228)',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          width: '250px',
          padding: '5px',
          gap: '5px',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, auto)',
          zIndex: 15
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="click-item"
            onClick={() => {
              onItemSelect(item.id);
              onClose();
            }}
            style={{
              padding: '10px',
              backgroundColor: 'rgb(186, 186, 186)',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              fontSize: '15px',
              gridColumn: index === 6 ? '2' : 'auto'
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
}; 