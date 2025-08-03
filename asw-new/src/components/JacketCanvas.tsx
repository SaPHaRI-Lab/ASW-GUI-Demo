import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import type { WearableItem, Position } from '../types';
import { adjustColor, updateShade } from '../utils/colorUtils';
import { RightClickMenu } from './RightClickMenu';

// Helper function to check if an element is an input element
const isInputElement = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || element.isContentEditable;
};

interface JacketCanvasProps {
  jacketImage: HTMLImageElement | null;
  setPendingItemType: (type: string | null) => void;
  setShowCreateItemPopup: (show: boolean) => void;
  setPendingDropPosition: (pos: Position | null) => void;
}

export const JacketCanvas: React.FC<JacketCanvasProps> = ({ 
  jacketImage, 
  setPendingItemType,
  setShowCreateItemPopup,
  setPendingDropPosition 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { jacketConfig, clearSelection, copyColor, pasteColor, copyItem, pasteItem, items: storeItems, selectedItemId, selectMultipleItems, selectItem } = useAppStore();
  const { createItem, moveItem, saveUndoState } = useDragAndDrop();
  
  // State for dragging existing items
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItem: null as any,
    offset: { x: 0, y: 0 },
    initialPositions: new Map() as Map<string, { x: number, y: number }>,
    hasMoved: false
  });

  // State for rotation
  const [rotationState, setRotationState] = useState({
    isRotating: false,
    rotatingItem: null as any,
    startAngle: 0
  });

  // State for marquee selection
  const [marqueeState, setMarqueeState] = useState({
    isActive: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  });

  // Flag to prevent onClick after marquee selection
  const [justCompletedMarquee, setJustCompletedMarquee] = useState(false);

  // State for right-click menu
  const [rightClickMenu, setRightClickMenu] = useState<{ x: number; y: number } | null>(null);

  // Add this near the top of the component with other state
  const [animationFrame, setAnimationFrame] = useState(0);

  // Add this useEffect for continuous updates
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Helper function to get item bounds
  const getItemBounds = useCallback((itemType: string, item?: WearableItem) => {
    switch (itemType) {
      case 'fur-patch': {
        const baseWidth = 40;
        const extraWidth = item?.amount ? Math.floor((item.amount - 15) / 2) * 12 : 0;
        return { width: baseWidth + extraWidth, height: 35 };
      }
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
    return storeItems.find(item => {
      // Only check items on current view
      if (item.view !== jacketConfig.view) return false;
      
      const bounds = getItemBounds(item.type, item);
      
      // If item has rotation, we need to check against rotated bounds
      if (item.rotation) {
        // Transform the click point to item's local coordinate system
        const centerX = item.position.x + bounds.width / 2;
        const centerY = item.position.y + bounds.height / 2;
        
        // Translate to origin
        const translatedX = x - centerX;
        const translatedY = y - centerY;
        
        // Rotate by negative rotation to undo the item's rotation
        const angle = (-item.rotation * Math.PI) / 180;
        const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
        const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
        
        // Translate back and check bounds
        const localX = rotatedX + centerX;
        const localY = rotatedY + centerY;
        
        return localX >= item.position.x && 
               localX <= item.position.x + bounds.width &&
               localY >= item.position.y && 
               localY <= item.position.y + bounds.height;
      }
      
      // For non-rotated items, use simple bounds check
      return x >= item.position.x && 
             x <= item.position.x + bounds.width &&
             y >= item.position.y && 
             y <= item.position.y + bounds.height;
    });
  }, [storeItems, getItemBounds, jacketConfig.view]);

  // Helper function to check if clicking on rotation handle
  const getRotationHandleAtPosition = useCallback((x: number, y: number) => {
    const selectedItem = storeItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return null;

    const bounds = getItemBounds(selectedItem.type, selectedItem);
    
    // The rotation handle position in the item's local coordinate system
    // (matching the drawing code exactly)
    const localHandleX = bounds.width / 2;
    const localHandleY = -15;
    
    // Transform the handle position the same way the canvas does
    let transformedX = localHandleX;
    let transformedY = localHandleY;
    
    // If item is rotated, apply rotation transformation
    if (selectedItem.rotation) {
      // First, translate to center for rotation
      const centerOffsetX = bounds.width / 2;
      const centerOffsetY = bounds.height / 2;
      
      // Translate handle position relative to center
      const relativeX = localHandleX - centerOffsetX;
      const relativeY = localHandleY - centerOffsetY;
      
      // Apply rotation
      const angle = (selectedItem.rotation * Math.PI) / 180;
      const rotatedX = relativeX * Math.cos(angle) - relativeY * Math.sin(angle);
      const rotatedY = relativeX * Math.sin(angle) + relativeY * Math.cos(angle);
      
      // Translate back
      transformedX = rotatedX + centerOffsetX;
      transformedY = rotatedY + centerOffsetY;
    }
    
    // Convert to absolute canvas coordinates
    const absoluteHandleX = selectedItem.position.x + transformedX;
    const absoluteHandleY = selectedItem.position.y + transformedY;
    
    // Check if click is within handle radius (5px + some tolerance)
    const distance = Math.sqrt((x - absoluteHandleX) ** 2 + (y - absoluteHandleY) ** 2);
    return distance <= 8 ? selectedItem : null;
  }, [storeItems, selectedItemId, getItemBounds]);

  // Helper function to calculate angle between two points
  const calculateAngle = useCallback((centerX: number, centerY: number, x: number, y: number) => {
    return Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
  }, []);

  // Get the updateItem function from the store
  const { updateItem } = useAppStore();

  // Helper function to get all selected items
  const getSelectedItems = useCallback(() => {
    return storeItems.filter(item => item.isSelected && item.view === jacketConfig.view);
  }, [storeItems, jacketConfig.view]);

  // Helper function to handle multi-selection logic
  const handleItemSelection = useCallback((clickedItem: any, isCtrlPressed: boolean) => {
    if (!clickedItem) {
      // Clicked on empty space - clear selection unless Ctrl is pressed
      if (!isCtrlPressed) {
        clearSelection();
      }
      return;
    }

    if (isCtrlPressed) {
      // Ctrl+Click: Toggle item in selection
      const selectedItems = getSelectedItems();
      const isCurrentlySelected = clickedItem.isSelected;
      
      if (isCurrentlySelected) {
        // Remove from selection
        const newSelection = selectedItems.filter(item => item.id !== clickedItem.id).map(item => item.id);
        selectMultipleItems(newSelection);
      } else {
        // Add to selection
        const newSelection = [...selectedItems.map(item => item.id), clickedItem.id];
        selectMultipleItems(newSelection);
      }
    } else {
      // Regular click: Select only this item
      selectItem(clickedItem.id);
    }
  }, [getSelectedItems, clearSelection, selectMultipleItems, selectItem]);

  // Helper function to get items within marquee rectangle
  const getItemsInRectangle = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Only proceed if marquee has some meaningful size (at least 5x5 pixels)
    if (maxX - minX < 5 || maxY - minY < 5) {
      return [];
    }
    
    // Use storeItems to ensure we're working with the store's data
    const selectedItems = storeItems.filter(item => {
      // Only check items on current view
      if (item.view !== jacketConfig.view) return false;
      
      const bounds = getItemBounds(item.type, item);
      const itemLeft = item.position.x;
      const itemRight = item.position.x + bounds.width;
      const itemTop = item.position.y;
      const itemBottom = item.position.y + bounds.height;
      
      // Check if marquee rectangle intersects with item rectangle
      const intersects = !(itemRight < minX || itemLeft > maxX || itemBottom < minY || itemTop > maxY);
      
      return intersects;
    });
    
    return selectedItems;
  }, [storeItems, getItemBounds, jacketConfig.view]);  // Handle drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const itemType = e.dataTransfer.getData('application/item-type');
    if (!itemType) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const bounds = getItemBounds(itemType as WearableItem['type'], { type: itemType as WearableItem['type'] } as WearableItem);
    const x = e.clientX - rect.left - (bounds.width / 2);
    const y = e.clientY - rect.top - (bounds.height / 2);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const imageData = ctx.getImageData(x + bounds.width / 2, y + bounds.height / 2, 1, 1);
      if (imageData.data[3] !== 0 && x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        if (itemType === 'other') {
          setPendingItemType('other');
          setShowCreateItemPopup(true);
          setPendingDropPosition({ x, y });
        } else {
          createItem(itemType as WearableItem['type'], { x, y });
        }
      }
    }
  }, [createItem, getItemBounds, setPendingItemType, setShowCreateItemPopup, setPendingDropPosition]);

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
        
        // Get the adjusted color based on gradient
        const baseColor = { r: jacketConfig.color.r, g: jacketConfig.color.g, b: jacketConfig.color.b, a: 1 };
        const adjustedColor = updateShade(baseColor, jacketConfig.gradient || 5);
        const colorMatch = adjustedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        
        if (colorMatch) {
          const [_, r, g, b] = colorMatch.map(Number);
          
          for (let i = 0; i < data.length; i += 4) {
            const pixelR = data[i];
            const pixelG = data[i + 1];
            const pixelB = data[i + 2];
            
            // Replace light gray areas with jacket color
            if (pixelR > 200 && pixelG > 200 && pixelB > 200) {
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
      }
      
      // Draw all items on the jacket (sorted by zIndex for proper layering)
      // Filter items by current view first
      const sortedItems = [...storeItems]
        .filter(item => item.view === jacketConfig.view)
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      sortedItems.forEach(item => {
        ctx.save();
        ctx.translate(item.position.x, item.position.y);
        const scale = item.size || 1;
        const bounds = getItemBounds(item.type, item);
        if (scale !== 1) {
          ctx.translate(bounds.width / 2, bounds.height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-bounds.width / 2, -bounds.height / 2);
        }
        if (item.rotation) {
          ctx.translate(bounds.width / 2, bounds.height / 2);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.translate(-bounds.width / 2, -bounds.height / 2);
        }
        if (item.movement && item.movement !== 'static') {
          ctx.save();
          /*switch (item.movement) {
            case 'Shake':
              // Enhanced shake with speed control
              const shakeIntensity = item.speed ? (item.speed / 100) * 3 : 2;
              const shakeX = (Math.random() - 0.5) * shakeIntensity;
              const shakeY = (Math.random() - 0.5) * shakeIntensity;
              ctx.translate(shakeX, shakeY);
              break;
            case 'Flash ind':
            case 'Flash str':
              // Enhanced flashing with speed-controlled timing (slower rate)
              if (item.isFlashing) {
                const flashSpeed = item.speed ? item.speed * 0.002 : 0.002; // Much slower
                const flashCycle = Math.sin(Date.now() * flashSpeed) > 0;
                if (flashCycle) {
                  ctx.shadowColor = item.color || '#FFD700';
                  ctx.shadowBlur = 15;
                }
              } else {
                // Steady glow for "Light on" states
                ctx.shadowColor = item.color || '#00FF00';
                ctx.shadowBlur = 5;
              }
              break;
            case 'Light on ind':
            case 'Light on str':
              // Add steady glow
              ctx.shadowColor = item.color || '#00FF00';
              ctx.shadowBlur = 5;
              break;
            case 'Trickle up':
            case 'Trickle down':
            case 'Random fl':
              // Light strip patterns are handled in the drawing section
              // Just add a subtle glow effect
              if (item.isFlashing && item.type === 'light-strip') {
                ctx.shadowColor = item.color || '#FFD700';
                ctx.shadowBlur = 8;
              }
              break;
            case 'pulsing':
              // Enhanced pulsing with speed control
              const pulseSpeed = item.speed ? item.speed * 0.001 : 0.005;
              const pulse = Math.sin(Date.now() * pulseSpeed) * 0.5 + 0.5;
              ctx.shadowColor = item.color || '#FFD700';
              ctx.shadowBlur = 8 + (pulse * 5);
              ctx.globalAlpha = 0.7 + (pulse * 0.3);
              break;
            case 'Roll':
              // Rotation effect for fur patches
              const rollSpeed = item.speed ? item.speed * 0.002 : 0.002;
              const rotation = Date.now() * rollSpeed;
              break;
          }
        }
        
        // Draw different item types
        switch (item.type) {
          case 'fur-patch': {
            const now = Date.now();
            ctx.save();
            for (let i = 0; i < 15; i++) {
              const col = i % 5;
              const row = Math.floor(i / 5);
              let x = col * 9;
              let y = row * 10;
              let angle = 0;
              if (item.movement === 'Shake') {
                const direction = (col % 2 === 0 ? 1 : -1);
                const speed = item.speed || 3;
                angle = Math.sin(now / (120 - speed * 15) + i) * 7 * direction;
              } else if (item.movement === 'Stick up') {
                angle = -40;
              } else if (item.movement === 'Both') {
                const direction = (col % 2 === 0 ? 1 : -1);
                const speed = item.speed || 3;
                angle = -40 + Math.sin(now / (120 - speed * 15) + i) * 7 * direction;
              } else if (item.movement === 'Roll') {
                const speed = item.speed || 3;
                const cycleTime = 1000 - (speed * 100);
                const rowPhase = (now % cycleTime) / cycleTime * 3;
                const currentRow = Math.floor(rowPhase);
                if (currentRow === row) {
                  const progress = (rowPhase - currentRow);
                  if (progress < 0.5) {
                    angle = -60 * (progress * 2);
                  } else {
                    angle = -60 * (2 - progress * 2);
                  }
                } else {
                  angle = 10;
                }
              }
              ctx.save();
              ctx.translate(x + 4, y + 10);
              ctx.rotate((angle * Math.PI) / 180);
              const furColor = item.color || (col % 2 === 0 ? '#d3d3d3' : '#e5e5e5');
              ctx.fillStyle = furColor;
              ctx.fillRect(-4, -10, 8, 20);
              ctx.restore();
            }
            ctx.restore();
            break;
          }
          case 'light-ind': {
            if (item.movement === 'Flash ind' && item.isFlashing) {
              const flashSpeed = item.speed ? item.speed * 0.002 : 0.002;
              const flashCycle = Math.sin(Date.now() * flashSpeed) > 0;
              ctx.fillStyle = flashCycle ? (item.color || '#FFD700') : '#333';
            } else {
              ctx.fillStyle = item.color || '#FFD700';
            }
            ctx.beginPath();
            ctx.arc(10, 10, 10, 0, Math.PI * 2);
            ctx.fill();
            break;
          }*/
          // Apply movement animations
          if (item.movement === 'Shake') {
            const speed = item.speed || 3;
            const direction = (item.position.x < canvasRef.current!.width / 2 ? 1 : -1);
            const now = Date.now();
            const angle = Math.sin(now / (120 - speed * 15)) * 7 * direction;
            ctx.translate(bounds.width / 2, bounds.height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.translate(-bounds.width / 2, -bounds.height / 2);
          } else if (item.movement === 'Stick up') {
            ctx.translate(bounds.width / 2, bounds.height / 2);
            ctx.rotate(-40 * Math.PI / 180);
            ctx.translate(-bounds.width / 2, -bounds.height / 2);
          } else if (item.movement === 'Both') {
            const speed = item.speed || 3;
            const now = Date.now();
            const baseAngle = -40;
            const shake = Math.sin(now / (120 - speed * 15)) * 10;
            ctx.translate(bounds.width / 2, bounds.height / 2);
            ctx.rotate(((baseAngle + shake) * Math.PI) / 180);
            ctx.translate(-bounds.width / 2, -bounds.height / 2);
          }
          ctx.restore();
        }

        switch (item.type) {
          case 'light-strip': {
            const numLights = item.amount || 6;
            const spacing = 210 / (numLights - 1);
            const totalHeight = (numLights - 1) * spacing + 20;
            const startY = 10;
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(10, startY);
            ctx.lineTo(10, startY + (numLights - 1) * spacing);
            ctx.stroke();
            for (let i = 0; i < numLights; i++) {
              let lightColor = '#333'; // Default off color
              if ((item.movement === 'Trickle up' || item.movement === 'Trickle down') && item.isFlashing) {
                const minInterval = 180, maxInterval = 400;
                const interval = maxInterval - ((item.speed - 1) * (maxInterval - minInterval) / 4);
                const now = Date.now();
                const currentLight = Math.floor(now / interval) % numLights;
                if (item.movement === 'Trickle up') {
                  const lightIndex = numLights - 1 - i;
                  if (lightIndex === currentLight) {
                    lightColor = item.color || '#FFD700';
                  }
                } else if (item.movement === 'Trickle down') {
                  if (i === currentLight) {
                    lightColor = item.color || '#FFD700';
                  }
                }
              } else if (item.movement === 'Random fl' && item.isFlashing) {
                const speed = item.speed ? item.speed * 0.005 : 0.005;
                const randomSeed = Math.sin(Date.now() * speed + i * 1.5);
                if (randomSeed > 0.3) {
                  lightColor = item.color || '#FFD700';
                }
              } else if (item.movement === 'Flash str' && item.isFlashing) {
                const flashSpeed = item.speed ? item.speed * 0.002 : 0.002;
                const flashCycle = Math.sin(Date.now() * flashSpeed) > 0;
                if (flashCycle) {
                  lightColor = item.color || '#FFD700';
                }
              } else if (item.movement === 'Light on str' || !item.movement || item.movement === 'static') {
                lightColor = item.color || '#FFD700';
              }
              ctx.fillStyle = lightColor;
              ctx.beginPath();
              ctx.arc(10, startY + i * spacing, 7, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }
          case 'fur-patch': {
            const now = Date.now();
            ctx.save();
            interface FurTriangle {
              w: number;
              h: number;
              x: number;
              y: number;
              r: number;
            }
            const columnPattern: FurTriangle[] = [
              { w: 11, h: 17, x: 0, y: 1, r: -12 },
              { w: 10, h: 15, x: 0, y: 8, r: -15 },
              { w: 9, h: 13, x: 0, y: 15, r: -3 }
            ];
            const baseTriangles: FurTriangle[] = [
              { w: 12, h: 18, x: 16, y: 0, r: -5 },
              { w: 11, h: 17, x: 22, y: 1, r: 8 },
              { w: 11, h: 17, x: 12, y: 1, r: -12 },
              { w: 10, h: 15, x: 8, y: 8, r: -20 },
              { w: 10, h: 15, x: 14, y: 8, r: -15 },
              { w: 10, h: 15, x: 26, y: 8, r: 15 },
              { w: 10, h: 15, x: 30, y: 8, r: 22 },
              { w: 9, h: 13, x: 18, y: 15, r: -3 },
              { w: 9, h: 13, x: 20, y: 15, r: 10 },
              { w: 8, h: 14, x: 4, y: 12, r: -25 },
              { w: 8, h: 14, x: 34, y: 12, r: 25 },
              { w: 10, h: 16, x: 16, y: 3, r: -8 },
              { w: 10, h: 16, x: 24, y: 3, r: 5 },
              { w: 8, h: 12, x: 10, y: 18, r: -18 },
              { w: 8, h: 12, x: 28, y: 18, r: 18 }
            ];
            const amount = item.amount || 15;
            const extraColumns = Math.floor((amount - 15) / 2);
            const triangles: FurTriangle[] = [...baseTriangles];
            for (let i = 1; i <= extraColumns; i++) {
              columnPattern.forEach(base => {
                triangles.push({
                  ...base,
                  x: base.x + 30 + (i * 6),
                  r: base.r + (i * 3),
                  w: base.w * 0.95
                });
              });
              columnPattern.forEach(base => {
                triangles.push({
                  ...base,
                  x: base.x + 8 - (i * 6),
                  r: base.r - (i * 3),
                  w: base.w * 0.95
                });
              });
            }
            triangles.forEach((t) => {
              let angle = t.r;
              if (item.movement === 'Shake') {
                const speed = item.speed || 3;
                const direction = (t.x < 22 ? 1 : -1);
                angle += Math.sin(now / (120 - speed * 15)) * 7 * direction;
              } else if (item.movement === 'Roll') {
                const speed = item.speed || 3;
                const animationSpeed = 600 - speed * 50;
                let rowIndex = -1;
                if (t.y <= 3) {
                  rowIndex = 0; // Top row
                } else if (t.y > 3 && t.y <= 12) {
                  rowIndex = 1; // Middle row
                } else {
                  rowIndex = 2; // Bottom row
                }
                const totalPhase = Math.floor((now / animationSpeed) % 6);
                const isDownPhase = totalPhase < 3;
                const currentRowPhase = totalPhase % 3;
                if (currentRowPhase === rowIndex) {
                  const progress = ((now / animationSpeed) % 1);
                  if (isDownPhase) {
                    angle += -60 * progress;
                  } else {
                    angle += -60 + (60 * progress);
                  }
                }
              } else if (item.movement === 'Stick up') {
                angle -= 40;
              } else if (item.movement === 'Both') {
                const speed = item.speed || 3;
                const baseAngle = -40;
                const shake = Math.sin(now / (120 - speed * 15)) * 10;
                angle += baseAngle + shake;
              }
              ctx.save();
              ctx.translate(t.x + t.w/2, t.y + t.h/2);
              ctx.rotate((angle * Math.PI) / 180);
              ctx.translate(-t.w/2, -t.h/2);
              ctx.fillStyle = item.color || '#8B4513';
              ctx.beginPath();
              const radius = 4;
              const topX = t.w/2;
              const topY = radius;
              const leftX = radius;
              const leftY = t.h - radius;
              const rightX = t.w - radius;
              const rightY = t.h - radius;
              ctx.moveTo(topX, 0);
              ctx.lineTo(t.w, t.h - radius);
              ctx.quadraticCurveTo(t.w, t.h, rightX, t.h);
              ctx.lineTo(leftX, t.h);
              ctx.quadraticCurveTo(0, t.h, 0, leftY);
              ctx.lineTo(topX, 0);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            });
            ctx.restore();
            break;
          }
          case 'light-ind': {
            if (item.movement === 'Flash ind' && item.isFlashing) {
              const flashSpeed = item.speed ? item.speed * 0.002 : 0.002;
              const flashCycle = Math.sin(Date.now() * flashSpeed) > 0;
              ctx.fillStyle = flashCycle ? (item.color || '#FFD700') : '#333';
            } else {
              ctx.fillStyle = item.color || '#FFD700';
            }
            ctx.beginPath();
            ctx.arc(10, 10, 10, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'battery':
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 50, 20);
            const numBars = item.speed || 3;
            for (let i = 0; i < 5; i++) {
              if (i < numBars) {
                ctx.fillStyle = item.color || '#4CAF50';
                ctx.fillRect(2 + i * 9, 2, 7, 16);
              }
            }
            ctx.fillStyle = '#333';
            ctx.fillRect(50, 6, 4, 8);
            break;
          case 'display':
            ctx.fillStyle = item.color || '#000';
            ctx.fillRect(0, 0, 60, 40);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 60, 40);
            break;
          case 'speaker':
            ctx.fillStyle = item.color || '#1d1d1d';
            ctx.fillRect(0, 5, 10, 10);
            ctx.beginPath();
            ctx.moveTo(8, 5);
            ctx.lineTo(23, 0);
            ctx.lineTo(23, 20);
            ctx.lineTo(8, 15);
            ctx.closePath();
            ctx.fill();
            break;
          case 'other':
            ctx.fillStyle = item.color || '#888';
            ctx.fillRect(0, 0, 40, 30);
            ctx.strokeStyle = '#666';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(0, 0, 40, 30);
            ctx.setLineDash([]);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const displayText = item.cyoName || '?';
            ctx.fillText(displayText, 20, 15);
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
          const bounds = getItemBounds(item.type, item);
          const isPrimarySelection = item.id === selectedItemId;
          
          // Use different colors for primary vs secondary selections
          ctx.strokeStyle = isPrimarySelection ? '#0077ff' : '#00aaff';
          ctx.lineWidth = isPrimarySelection ? 3 : 2;
          ctx.strokeRect(-5, -5, bounds.width + 10, bounds.height + 10);
          
          // Draw rotation handle only for the primary selected item
          if (isPrimarySelection) {
            const handleX = bounds.width / 2;
            const handleY = -15;
            ctx.fillStyle = '#0077ff';
            ctx.beginPath();
            ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw line from selection box to rotation handle
            ctx.strokeStyle = '#0077ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(handleX, handleY + 5);
            ctx.lineTo(handleX, -5);
            ctx.stroke();
          }
        }
        
        ctx.restore();
      });
      
      // Draw marquee selection rectangle
      if (marqueeState.isActive) {
        const minX = Math.min(marqueeState.startX, marqueeState.endX);
        const minY = Math.min(marqueeState.startY, marqueeState.endY);
        const width = Math.abs(marqueeState.endX - marqueeState.startX);
        const height = Math.abs(marqueeState.endY - marqueeState.startY);
        
        ctx.strokeStyle = '#0077ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(minX, minY, width, height);
        
        ctx.fillStyle = 'rgba(0, 119, 255, 0.1)';
        ctx.fillRect(minX, minY, width, height);
        
        ctx.setLineDash([]); // Reset line dash
      }
    }
  }, [jacketImage, jacketConfig.color, jacketConfig.gradient, jacketConfig.view, storeItems, marqueeState]);

  useEffect(() => {
    drawJacket();
  }, [drawJacket, jacketConfig.gradient]);

  // Keyboard shortcuts for copy/paste colors and elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedItems = getSelectedItems();
      const primarySelectedItem = storeItems.find(item => item.id === selectedItemId);
      
      if (e.ctrlKey || e.metaKey) { // Ctrl on Windows/Linux, Cmd on Mac
        if (e.key === 'c' && selectedItems.length > 0) {
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Ctrl+C: Copy color from primary selected item
            if (primarySelectedItem?.color) {
              copyColor(primarySelectedItem.color);
              console.log('Color copied:', primarySelectedItem.color);
            }
          } else {
            // Ctrl+C: Copy element(s)
            if (selectedItems.length === 1) {
              copyItem();
              console.log('Element copied:', selectedItems[0].id);
            } else {
              // For multiple items, copy the primary selected item for now
              // TODO: Implement multi-item copy functionality
              copyItem();
              console.log('Multiple elements - copied primary:', primarySelectedItem?.id);
            }
          }
        } else if (e.key === 'v') {
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Ctrl+V: Paste color to all selected items
            if (selectedItems.length > 0) {
              pasteColor();
              console.log('Color pasted to selected items');
            }
          } else {
            // Ctrl+V: Paste element
            pasteItem();
            console.log('Element pasted');
          }
        }
      }
      
      // Delete/Backspace works WITHOUT requiring Ctrl/Cmd
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputElement(e.target as HTMLElement)) {
        e.preventDefault();
        if (selectedItems.length > 0) {
          console.log('DELETE KEY: Deleting', selectedItems.length, 'items:', selectedItems.map(item => item.id));
          selectedItems.forEach(item => {
            // Use the store's removeItem function for each selected item
            const removeItem = useAppStore.getState().removeItem;
            removeItem(item.id);
          });
          console.log('DELETE COMPLETE: Deleted', selectedItems.length, 'items');
        } else {
          console.log('DELETE KEY: No items selected');
        }
      }

      // Handle arrow keys for item movement
      if (selectedItemId) {
        const selectedItem = storeItems.find(item => item.id === selectedItemId);
        if (selectedItem) {
          const moveStep = e.shiftKey ? 10 : 1; // Hold shift for larger movements
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x - moveStep, 
                y: selectedItem.position.y 
              });
              break;
            case 'ArrowRight':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x + moveStep, 
                y: selectedItem.position.y 
              });
              break;
            case 'ArrowUp':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x, 
                y: selectedItem.position.y - moveStep 
              });
              break;
            case 'ArrowDown':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x, 
                y: selectedItem.position.y + moveStep 
              });
              break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyColor, pasteColor, copyItem, pasteItem, storeItems, selectedItemId, getSelectedItems, moveItem]);

  // Animation loop for movement effects
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = 0;
    const frameDuration = 1000 / 30; // 30 FPS instead of 60 FPS
    
    const hasAnimatedItems = storeItems.some(item => 
      item.movement && [
        'Shake', 'Flash ind', 'Flash str', 'pulsing', 'Roll',
        'Trickle up', 'Trickle down', 'Random fl', 'Both'
      ].includes(item.movement) ||
      item.isFlashing
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
  }, [storeItems, drawJacket]);

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
        setRightClickMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }
    }
  }, []);

  const handleMenuItemSelect = useCallback((itemType: string) => {
    if (rightClickMenu) {
      const x = rightClickMenu.x;
      const y = rightClickMenu.y;
      
      if (itemType === 'other') {
        setPendingItemType('other');
        setShowCreateItemPopup(true);
        setPendingDropPosition({ x, y });
      } else {
        createItem(itemType as WearableItem['type'], { x, y });
      }
    }
    setRightClickMenu(null);
  }, [rightClickMenu, createItem, setPendingItemType, setShowCreateItemPopup, setPendingDropPosition]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent click handling if we just completed a marquee selection
    if (justCompletedMarquee) {
      setJustCompletedMarquee(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const clickedItem = getItemAtPosition(x, y);
      const isCtrlPressed = event.ctrlKey || event.metaKey;
      
      if (clickedItem) {
        // Use our multi-selection aware handler instead of handleItemClick
        handleItemSelection(clickedItem, isCtrlPressed);
      } else {
        clearSelection();
      }
    }
  }, [getItemAtPosition, clearSelection, justCompletedMarquee, handleItemSelection]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    
    // Check if clicking on rotation handle first
    const rotationItem = getRotationHandleAtPosition(x, y);
    if (rotationItem) {
      saveUndoState();
      const bounds = getItemBounds(rotationItem.type, rotationItem);
      const centerX = rotationItem.position.x + bounds.width / 2;
      const centerY = rotationItem.position.y + bounds.height / 2;
      const startAngle = calculateAngle(centerX, centerY, x, y);
      
      setRotationState({
        isRotating: true,
        rotatingItem: rotationItem,
        startAngle: startAngle - (rotationItem.rotation || 0)
      });
      return;
    }
    
    const clickedItem = getItemAtPosition(x, y);
    
    if (clickedItem) {
      // If clicking on an already selected item, don't change selection yet
      // (we'll handle selection on mouseUp if no drag occurred)
      const isClickedItemSelected = clickedItem.isSelected || clickedItem.id === selectedItemId;
      
      if (!isClickedItemSelected || isCtrlPressed) {
        // Only change selection if:
        // 1. Clicking on an unselected item, OR
        // 2. Using Ctrl (for multi-selection toggle)
        handleItemSelection(clickedItem, isCtrlPressed);
      }
      
      // Always allow dragging of any clicked item
      saveUndoState();
      
      const offsetX = x - clickedItem.position.x;
      const offsetY = y - clickedItem.position.y;
      
      // Store initial positions for all selected items (for multi-drag)
      const selectedItems = getSelectedItems();
      const isDraggedItemSelected = clickedItem.isSelected || clickedItem.id === selectedItemId;
      const initialPositions = new Map();
      
      if (isDraggedItemSelected && selectedItems.length > 1) {
        // Multi-item drag: store all selected item positions
        selectedItems.forEach(item => {
          initialPositions.set(item.id, { x: item.position.x, y: item.position.y });
        });
      } else {
        // Single item drag
        initialPositions.set(clickedItem.id, { x: clickedItem.position.x, y: clickedItem.position.y });
      }
      
      setDragState({
        isDragging: true,
        draggedItem: clickedItem,
        offset: {
          x: offsetX,
          y: offsetY
        },
        initialPositions,
        hasMoved: false
      });
    } else if (!isCtrlPressed) {
      // Start marquee selection when clicking on empty space (without Ctrl)
      setMarqueeState({
        isActive: true,
        startX: x,
        startY: y,
        endX: x,
        endY: y
      });
    }
  }, [getItemAtPosition, getRotationHandleAtPosition, calculateAngle, getItemBounds, saveUndoState, handleItemSelection, selectedItemId]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (rotationState.isRotating && rotationState.rotatingItem) {
      // Handle rotation
      const bounds = getItemBounds(rotationState.rotatingItem.type, rotationState.rotatingItem);
      const centerX = rotationState.rotatingItem.position.x + bounds.width / 2;
      const centerY = rotationState.rotatingItem.position.y + bounds.height / 2;
      const currentAngle = calculateAngle(centerX, centerY, x, y);
      const newRotation = currentAngle - rotationState.startAngle;
      
      updateItem(rotationState.rotatingItem.id, { rotation: newRotation });
    } else if (dragState.isDragging && dragState.draggedItem) {
      // Handle dragging - use initial positions to maintain relative positions
      const mouseX = x - dragState.offset.x;
      const mouseY = y - dragState.offset.y;
      
      // Calculate the movement delta from the dragged item's initial position
      const draggedItemInitialPos = dragState.initialPositions.get(dragState.draggedItem.id);
      if (!draggedItemInitialPos) return;
      
      const deltaX = mouseX - draggedItemInitialPos.x;
      const deltaY = mouseY - draggedItemInitialPos.y;
      
      // Mark as moved if there's any significant movement
      if (!dragState.hasMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        setDragState(prev => ({ ...prev, hasMoved: true }));
      }
      
      // Apply the same delta to all items that were initially stored
      dragState.initialPositions.forEach((initialPos, itemId) => {
        const newX = initialPos.x + deltaX;
        const newY = initialPos.y + deltaY;
        moveItem(itemId, { x: newX, y: newY });
      });
    } else if (marqueeState.isActive) {
      // Update marquee selection rectangle
      setMarqueeState(prev => ({
        ...prev,
        endX: x,
        endY: y
      }));
    } else {
      // Change cursor when hovering over items or rotation handles
      const hoverItem = getItemAtPosition(x, y);
      const hoverRotationHandle = getRotationHandleAtPosition(x, y);
      
      if (canvas) {
        if (hoverRotationHandle) {
          canvas.style.cursor = 'grab';
        } else if (hoverItem) {
          canvas.style.cursor = 'pointer';
        } else {
          canvas.style.cursor = 'default';
        }
      }
    }
  }, [dragState, rotationState, moveItem, getItemAtPosition, getRotationHandleAtPosition, 
      calculateAngle, getItemBounds, updateItem, getSelectedItems, marqueeState]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Complete marquee selection if active
    if (marqueeState.isActive) {
      const itemsInMarquee = getItemsInRectangle(
        marqueeState.startX, 
        marqueeState.startY, 
        marqueeState.endX, 
        marqueeState.endY
      );
      
      if (itemsInMarquee.length > 0) {
        selectMultipleItems(itemsInMarquee.map(item => item.id));
      }
      
      // Set flag to prevent onClick from clearing the selection
      setJustCompletedMarquee(true);
      
      setMarqueeState({
        isActive: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
      });
    }
    
    // Handle single-click selection for already selected items
    // (when no drag occurred and it's not a multi-item drag)
    if (dragState.isDragging && dragState.draggedItem) {
      // For debugging purposes, keep the debug output but remove the selection change logic
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if this was actually a click (no significant movement)
        const startX = dragState.draggedItem.position.x + dragState.offset.x;
        const startY = dragState.draggedItem.position.y + dragState.offset.y;
        const distance = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
        
        const selectedItems = getSelectedItems();
        const isMultiDrag = selectedItems.length > 1 && dragState.initialPositions.size > 1;
        
        console.log('MOUSE UP DEBUG:', {
          distance: distance.toFixed(2),
          hasMoved: dragState.hasMoved,
          selectedItemsCount: selectedItems.length,
          initialPositionsSize: dragState.initialPositions.size,
          isMultiDrag,
          draggedItemId: dragState.draggedItem.id,
          action: 'PRESERVING_CURRENT_SELECTION'
        });
        
        // Don't change selection on mouseUp - let the mouseDown/handleClick handle it
        // This prevents multi-selection from being cleared after dragging
      }
    }
    
    setDragState({
      isDragging: false,
      draggedItem: null,
      offset: { x: 0, y: 0 },
      initialPositions: new Map(),
      hasMoved: false
    });
    setRotationState({
      isRotating: false,
      rotatingItem: null,
      startAngle: 0
    });
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, [marqueeState, getItemsInRectangle, selectMultipleItems, dragState, selectedItemId, selectItem, getSelectedItems]);

  const { isDragging, isRotating } = dragState;

  return (
    <>
      <canvas
        ref={canvasRef}
        width={480}
        height={550}
        onContextMenu={handleRightClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dragState.isDragging ? 'grabbing' : 'default' }}
      />
      {rightClickMenu && (
        <RightClickMenu
          position={rightClickMenu}
          onItemSelect={handleMenuItemSelect}
          onClose={() => setRightClickMenu(null)}
        />
      )}
    </>
  );
};
