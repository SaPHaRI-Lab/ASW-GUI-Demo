import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import type { WearableItem } from '../types';

interface JacketCanvasProps {
  jacketImage: HTMLImageElement | null;
}

export const JacketCanvas: React.FC<JacketCanvasProps> = ({ jacketImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { jacketConfig, clearSelection } = useAppStore();
  const { createItem, items, handleItemClick, moveItem, saveUndoState } = useDragAndDrop();
  
  // State for dragging existing items
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItem: null as any,
    offset: { x: 0, y: 0 }
  });

  // Helper function to get item bounds
  const getItemBounds = useCallback((itemType: string) => {
    switch (itemType) {
      case 'fur-patch': return { width: 45, height: 30 };
      case 'light-ind': return { width: 20, height: 20 };
      case 'light-strip': return { width: 20, height: 210 };
      case 'battery': return { width: 60, height: 25 };
      case 'display': return { width: 60, height: 40 };
      case 'speaker': return { width: 40, height: 30 };
      default: return { width: 40, height: 30 };
    }
  }, []);

  // Helper function for consistent hit detection
  const getItemAtPosition = useCallback((x: number, y: number) => {
    return items.find(item => {
      const bounds = getItemBounds(item.type);
      return x >= item.position.x && 
             x <= item.position.x + bounds.width &&
             y >= item.position.y && 
             y <= item.position.y + bounds.height;
    });
  }, [items, getItemBounds]);  // Handle drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemType = e.dataTransfer.getData('application/item-type');
    
    if (!itemType) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get item dimensions to properly center it at cursor position
    const bounds = getItemBounds(itemType);
    const x = e.clientX - rect.left - (bounds.width / 2); // Center the item
    const y = e.clientY - rect.top - (bounds.height / 2);

    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      createItem(itemType as WearableItem['type'], { x, y });
    }
  }, [createItem, getItemBounds]);

  // Draw jacket with current color configuration
  const drawJacket = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx && jacketImage && jacketImage.complete) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(jacketImage, 0, 0, canvas.width, canvas.height);
      
      // Apply jacket color if not default
      if (jacketConfig.color.r !== 227 || jacketConfig.color.g !== 227 || jacketConfig.color.b !== 227) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Replace light gray areas with jacket color
          if (r > 200 && g > 200 && b > 200) {
            data[i] = jacketConfig.color.r;
            data[i + 1] = jacketConfig.color.g;
            data[i + 2] = jacketConfig.color.b;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Draw all items on the jacket (sorted by zIndex for proper layering)
      const sortedItems = [...items].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      sortedItems.forEach(item => {
        ctx.save();
        ctx.translate(item.position.x, item.position.y);
        
        // Apply visual effects based on movement type
        if (item.movement && item.movement !== 'static') {
          ctx.save();
          
          switch (item.movement) {
            case 'Shake':
              // Add slight random offset for shake effect
              const shakeX = (Math.random() - 0.5) * 2;
              const shakeY = (Math.random() - 0.5) * 2;
              ctx.translate(shakeX, shakeY);
              break;
            case 'Flash ind':
            case 'Flash str':
              // Add glow effect for flashing
              ctx.shadowColor = '#FFD700';
              ctx.shadowBlur = 10;
              break;
            case 'Light on ind':
            case 'Light on str':
              // Add steady glow
              ctx.shadowColor = '#00FF00';
              ctx.shadowBlur = 5;
              break;
            case 'pulsing':
              // Add pulsing glow
              const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
              ctx.shadowColor = `rgba(255, 215, 0, ${pulse})`;
              ctx.shadowBlur = 8;
              break;
          }
        }
        
        // Draw different item types
        switch (item.type) {
          case 'fur-patch':
            ctx.fillStyle = '#8B4513';
            for (let i = 0; i < 15; i++) {
              const x = (i % 5) * 9;
              const y = Math.floor(i / 5) * 10;
              ctx.fillRect(x, y, 8, 10);
            }
            break;
          case 'light-ind':
            ctx.fillStyle = item.color || '#FFD700';
            ctx.beginPath();
            ctx.arc(10, 10, 10, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'light-strip':
            ctx.fillStyle = '#444';
            ctx.fillRect(0, 0, 20, 210);
            ctx.fillStyle = item.color || '#FFD700';
            for (let i = 0; i < 6; i++) {
              ctx.beginPath();
              ctx.arc(10, 10 + i * 35, 7, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          case 'battery':
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 50, 20);
            ctx.fillStyle = '#4CAF50';
            for (let i = 0; i < 5; i++) {
              ctx.fillRect(2 + i * 9, 2, 7, 16);
            }
            break;
          case 'display':
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 60, 40);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 60, 40);
            break;
          case 'speaker':
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 30, 20);
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.moveTo(30, 5);
            ctx.lineTo(45, 0);
            ctx.lineTo(45, 20);
            ctx.lineTo(30, 15);
            ctx.fill();
            break;
          default:
            ctx.fillStyle = '#888';
            ctx.fillRect(0, 0, 40, 30);
            ctx.strokeStyle = '#666';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(0, 0, 40, 30);
            ctx.setLineDash([]);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', 20, 20);
            break;
        }
        
        // Reset visual effects after drawing
        if (item.movement && item.movement !== 'static') {
          ctx.restore();
        }
        
        // Draw selection indicator if selected
        if (item.isSelected) {
          const bounds = getItemBounds(item.type);
          ctx.strokeStyle = '#0077ff';
          ctx.lineWidth = 3;
          ctx.strokeRect(-5, -5, bounds.width + 10, bounds.height + 10);
        }
        
        ctx.restore();
      });
    }
  }, [jacketImage, jacketConfig.color, items]);

  useEffect(() => {
    drawJacket();
  }, [drawJacket]);

  // Animation loop for movement effects
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = 0;
    const frameDuration = 1000 / 30; // 30 FPS instead of 60 FPS
    
    const hasAnimatedItems = items.some(item => 
      item.movement && ['Shake', 'Flash ind', 'Flash str', 'pulsing'].includes(item.movement)
    );
    
    if (hasAnimatedItems) {
      const animate = (currentTime: number) => {
        if (currentTime - lastFrameTime >= frameDuration) {
          drawJacket();
          lastFrameTime = currentTime;
        }
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, [items, drawJacket]);

  const handleRightClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Check if click is within jacket bounds by checking pixel alpha
      const imageData = ctx.getImageData(x, y, 1, 1);
      if (imageData.data[3] !== 0) {
        // Show context menu for item creation - for now just create a default item
        createItem('other', { x, y });
      }
    }
  }, [createItem]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const clickedItem = getItemAtPosition(x, y);
      
      if (clickedItem) {
        handleItemClick(clickedItem.id);
      } else {
        clearSelection();
      }
    }
  }, [getItemAtPosition, clearSelection, handleItemClick]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickedItem = getItemAtPosition(x, y);
    
    if (clickedItem) {
      // Save undo state before starting drag operation
      saveUndoState();
      
      const offsetX = x - clickedItem.position.x;
      const offsetY = y - clickedItem.position.y;
      
      
      setDragState({
        isDragging: true,
        draggedItem: clickedItem,
        offset: {
          x: offsetX,
          y: offsetY
        }
      });
    }
  }, [getItemAtPosition, saveUndoState]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (dragState.isDragging && dragState.draggedItem) {
      // Update item position
      const newX = x - dragState.offset.x;
      const newY = y - dragState.offset.y;
      
      
      moveItem(dragState.draggedItem.id, { x: newX, y: newY });
    } else {
      // Change cursor when hovering over items
      const hoverItem = getItemAtPosition(x, y);
      if (canvas) {
        canvas.style.cursor = hoverItem ? 'pointer' : 'default';
      }
    }
  }, [dragState, moveItem, getItemAtPosition]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      offset: { x: 0, y: 0 }
    });
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        id="jacketCanvas"
        className="jacket-canvas"
        width={550}
        height={550}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </>
  );
};
