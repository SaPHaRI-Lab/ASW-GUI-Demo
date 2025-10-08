import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import type { WearableItem, Position } from '../types';
import { adjustColor, updateShade, rgbToHex } from '../utils/colorUtils';
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
  const { jacketConfig, clearSelection, copyColor, pasteColor, copyItem, pasteItem, items: storeItems, selectedItemId, selectMultipleItems, selectItem, logAction, undo, redo } = useAppStore();
  const { createItem, moveItem, saveUndoState } = useDragAndDrop();
  
  // State for dragging existing items
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItem: null as any,
    offset: { x: 0, y: 0 },
    initialPositions: new Map() as Map<string, { x: number, y: number }>,
    hasMoved: false,
    isMultiSelect: false
  });

  // State for rotation
  const [rotationState, setRotationState] = useState({
    isRotating: false,
    rotatingItem: null as any,
    startAngle: 0,
    startRotation: 0,
    hasMoved: false,
    rotationDone: false
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
        const extraColumns = item?.amount ? Math.floor((item.amount - 15) / 2) : 0;
        const extraWidth = extraColumns * 14;
        const totalWidth = baseWidth + extraWidth;
        const baseHeight = 35;
        const verticalRows = item?.verticalRows ?? 3;
        const extraRows = verticalRows - 3;
        const extraHeight = extraRows * 12;
        const totalHeight = baseHeight + extraHeight;
        return { width: totalWidth, height: totalHeight };
      }
      case 'light-ind': return { width: 20, height: 20 };
      case 'light-strip': {
        const length = item?.length ?? 1;
        const numLights = item?.amount || 6;
        const spacing = (210 * length) / (numLights - 1);
        return { width: 20, height: (numLights - 1) * spacing + 20 };
      }
      case 'battery': return { width: 60, height: 25 };
      case 'display': return { width: 60, height: 40 };
      case 'speaker': return { width: 40, height: 30 };
      case 'scent': return { width: 35, height: 35 };
      case 'inflatable': return { 
        width: (item?.inflatableWidth ?? 27.5) * 2, 
        height: (item?.inflatableLength ?? 17.5) * 2 
      };
      default: return { width: 40, height: 30 };
    }
  }, []);

  // Helper function for consistent hit detection
  const getItemAtPosition = useCallback((x: number, y: number) => {
    return storeItems.find(item => {
      // Only check items on current view
      if (item.view !== jacketConfig.view) return false;
      
      const bounds = getItemBounds(item.type, item);
      const scale = item.size || 1;
      const leftExpansion = item.type === 'fur-patch' ? Math.max(0, (bounds.width - 40) / 2) : 0;
      const minX = item.position.x - leftExpansion;
      
      // If item has rotation, we need to check against rotated bounds
      if (item.rotation) {
        // Transform the click point to item's local coordinate system
        const centerX = minX + bounds.width / 2;
        const centerY = item.position.y + bounds.height / 2;
        
        // Translate to origin
        let translatedX = x - centerX;
        let translatedY = y - centerY;
        
        // Rotate by negative rotation to undo the item's rotation
        const angle = (-item.rotation * Math.PI) / 180;
        let rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
        let rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
        if (scale !== 1) {
          rotatedX /= scale;
          rotatedY /= scale;
        }
        
        // Translate back and check bounds
        const localX = rotatedX + centerX;
        const localY = rotatedY + centerY;
        
        return localX >= minX && 
               localX <= minX + bounds.width &&
               localY >= item.position.y && 
               localY <= item.position.y + bounds.height;
      }
      
      // For non-rotated items, use simple bounds check
      if (scale !== 1) {
        const centerX = minX + bounds.width / 2;
        const centerY = item.position.y + bounds.height / 2;
        const invX = (x - centerX) / scale + centerX;
        const invY = (y - centerY) / scale + centerY;
        return invX >= minX && 
               invX <= minX + bounds.width &&
               invY >= item.position.y && 
               invY <= item.position.y + bounds.height;
      }
      return x >= minX && 
             x <= minX + bounds.width &&
             y >= item.position.y && 
             y <= item.position.y + bounds.height;
    });
  }, [storeItems, getItemBounds, jacketConfig.view]);

  // Helper function to check if clicking on rotation handle
  const getRotationHandleAtPosition = useCallback((x: number, y: number) => {
    const selectedItem = storeItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return null;
    if (selectedItem.locked) return null;

    const bounds = getItemBounds(selectedItem.type, selectedItem);
    const leftExpansion = selectedItem.type === 'fur-patch' ? Math.max(0, (bounds.width-40) / 2) : 0;
    const scale = selectedItem.size || 1;
    
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
    
    // Apply scale to handle position to match visual scaling
    let scaledHandleX = transformedX;
    let scaledHandleY = transformedY;
    if (scale !== 1) {
      const centerOffsetX = bounds.width / 2;
      const centerOffsetY = bounds.height / 2;
      scaledHandleX = centerOffsetX + (transformedX - centerOffsetX) * scale;
      scaledHandleY = centerOffsetY + (transformedY - centerOffsetY) * scale;
    }

    // Convert to absolute canvas coordinates
    const absoluteHandleX = (selectedItem.position.x-leftExpansion) + scaledHandleX;
    const absoluteHandleY = selectedItem.position.y + scaledHandleY;
    
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

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Get the adjusted color based on gradient
        const baseColor = { r: jacketConfig.color.r, g: jacketConfig.color.g, b: jacketConfig.color.b, a: 1 };
        const adjustedColor = updateShade(baseColor, jacketConfig.gradient ?? 5);
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
      
      // Draw all items on the jacket (sorted by zIndex for proper layering)
      // Filter items by current view first
      const sortedItems = [...storeItems]
        .filter(item => item.view === jacketConfig.view)
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      sortedItems.forEach(item => {
        ctx.save();
        const bounds = getItemBounds(item.type, item);
        const leftExpansion = item.type === 'fur-patch' ? Math.max(0, (bounds.width-40) / 2) : 0;
        ctx.translate(item.position.x-leftExpansion, item.position.y);
        const scale = item.size || 1;
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
          }
          ctx.restore();
        }

        switch (item.type) {
          case 'light-strip': {
            const numLights = item.amount || 6;
            const length = item.length ?? 1;
            const spacing = (210 * length) / (numLights - 1);
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
              if ((item.movement === 'relaxed' || item.movement === 'sad') && item.isFlashing) {
                const minInterval = 180, maxInterval = 400;
                const interval = maxInterval - ((item.speed - 1) * (maxInterval - minInterval) / 4);
                const itemTime = item.animationStartTime || Date.now();
                const currentLight = Math.floor((Date.now()-itemTime) / interval) % numLights;
                if (item.movement === 'relaxed') {
                  const lightIndex = numLights - 1 - i;
                  if (lightIndex === currentLight) {
                    lightColor = item.color || '#FFD700';
                  }
                } else if (item.movement === 'sad') {
                  if (i === currentLight) {
                    lightColor = item.color || '#FFD700';
                  }
                }
              } else if (item.movement === 'happy' && item.isFlashing) {
                const speed = item.speed ? item.speed * 0.005 : 0.005;
                const itemTime = item.animationStartTime || Date.now();
                const randomSeed = Math.sin((Date.now()-itemTime) * speed + i * 1.5);
                if (randomSeed > 0.3) {
                  lightColor = item.color || '#FFD700';
                }
              } else if (item.movement === 'angry' && item.isFlashing) {
                const flashSpeed = item.speed ? item.speed * 0.002 : 0.002;
                const itemTime = item.animationStartTime || Date.now();
                const flashCycle = Math.sin((Date.now()-itemTime) * flashSpeed) > 0;
                if (flashCycle) {
                  lightColor = item.color || '#FFD700';
                }
              } else if (item.movement === 'scared' || !item.movement || item.movement === 'static') {
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
            const boundsForFur = getItemBounds(item.type, item);
            const offsetX = Math.max(0, (boundsForFur.width - 40) / 2);
            const baseTrianglesBase: FurTriangle[] = [
              { w: 12, h: 18, x: 14, y: 0, r: -5 },
              { w: 11, h: 17, x: 20, y: 1, r: 8 },
              { w: 11, h: 17, x: 10, y: 1, r: -12 },
              { w: 10, h: 15, x: 6, y: 8, r: -20 },
              { w: 10, h: 15, x: 12, y: 8, r: -15 },
              { w: 10, h: 15, x: 24, y: 8, r: 15 },
              { w: 10, h: 15, x: 28, y: 8, r: 22 },
              { w: 9, h: 13, x: 16, y: 15, r: -3 },
              { w: 9, h: 13, x: 18, y: 15, r: 10 },
              { w: 8, h: 14, x: 2, y: 12, r: -25 },
              { w: 8, h: 14, x: 32, y: 12, r: 25 },
              { w: 10, h: 16, x: 14, y: 3, r: -8 },
              { w: 10, h: 16, x: 22, y: 3, r: 5 },
              { w: 8, h: 12, x: 8, y: 18, r: -18 },
              { w: 8, h: 12, x: 26, y: 18, r: 18 }
            ];
            const baseTriangles: FurTriangle[] = baseTrianglesBase.map(t => ({ ...t, x: t.x + offsetX }));
            const amount = item.amount || 15;
            const extraColumns = Math.floor((amount - 15) / 2);
            const triangles: FurTriangle[] = [...baseTriangles];
            const baseLeft = offsetX;
            const baseRight = offsetX + 40;
            const colWidth = 8;
            for (let i = 1; i <= extraColumns; i++) {
              triangles.push(
                { w: 11, h: 17, x: baseLeft - colWidth * i + 8, y: 1, r: -12 },
                { w: 10, h: 15, x: baseLeft - colWidth * i + 8, y: 8, r: -15 },
                { w: 9, h: 13, x: baseLeft - colWidth * i + 8, y: 15, r: -3 }
              );
              triangles.push(
                { w: 11, h: 17, x: baseRight + colWidth * (i - 1) - 8, y: 1, r: 12 },
                { w: 10, h: 15, x: baseRight + colWidth * (i - 1) - 8, y: 8, r: 15 },
                { w: 9, h: 13, x: baseRight + colWidth * (i - 1) - 8, y: 15, r: 3 }
              );
            }

            // Vertical inc
            const verticalRows = item.verticalRows ?? 3;
            const extraRows = verticalRows - 3;
            if (extraRows > 0) {
              const baseTrianglesCopy = [...triangles];
              for (let i = 1; i <= extraRows; i++) {
                const yOffset = 12 * i;
                baseTrianglesCopy.forEach(base => {
                  triangles.push({
                    ...base,
                    y: base.y + yOffset,
                    w: base.w * 0.95,
                    h: base.h * 0.95
                  });
                });
              }
            }

            triangles.forEach((t) => {
              let angle = t.r;
              if (item.movement === 'Shake') {
                const speed = item.speed || 3;
                const direction = (t.x < 22 ? 1 : -1);
                angle += Math.sin(now / (120 - speed * 15)) * 7 * direction;
              } else if (item.movement === 'Roll' || item.movement === 'Roll btt') {
                const speed = item.speed || 3;
                const animationSpeed = 600 - speed * 50;
                let rowIndex = -1;
                if (verticalRows == 3) {
                  if (t.y <= 3) {
                    rowIndex = 0; // Top row
                  } else if (t.y <= 12) {
                    rowIndex = 1; // Middle row
                  } else {
                    rowIndex = 2; // Bottom row
                  }
                } else {
                  const rowHeight = 12;
                  rowIndex = Math.floor((t.y+3) / rowHeight);
                  rowIndex = Math.max(0, Math.min(rowIndex, verticalRows-1));
                }
                const totalCycleTime = animationSpeed * 6;
                const cycleProgress = (now%totalCycleTime) / totalCycleTime;
                if (item.movement === 'Roll btt') {
                  if (cycleProgress < 0.5) {
                    const upPhase = cycleProgress * 2;
                    const rollUpIndex = (verticalRows-1) - rowIndex;
                    const rowStartTime = rollUpIndex * (1/(verticalRows*2.5));
                    if (upPhase >= rowStartTime) {
                      const rowProgress = Math.min((upPhase-rowStartTime) * verticalRows, 1);
                      angle += -60 + (60 * rowProgress);
                    } else {
                      angle += -60;
                    }
                  } else {
                    const downPhase = (cycleProgress-0.5) * 2;
                    const rowProgress = Math.min(downPhase*verticalRows, 1);
                    angle += -60 * rowProgress;
                  }
                } else {
                  const cycleProgressDefault = cycleProgress;
                  if (cycleProgressDefault < 0.5) {
                    const downPhase = cycleProgressDefault * 2;
                    const rowStartTime = rowIndex * (1/(verticalRows*2.5));
                    if (downPhase >= rowStartTime) {
                      const rowProgress = Math.min((downPhase-rowStartTime) * verticalRows, 1);
                      angle += -60 * rowProgress;
                    }
                  } else {
                    const upPhase = (cycleProgressDefault - 0.5) * 2;
                    if (upPhase >= 0) {
                      const rowProgress = Math.min(upPhase * verticalRows, 1);
                      angle += -60 + (60 * rowProgress);
                    } else {
                      angle += -60;
                    }
                  }
                }
              } else if (item.movement === 'Stick up') {
                angle -= 40;
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
              const itemTime = item.animationStartTime || Date.now();
              const flashCycle = Math.sin((Date.now()-itemTime) * flashSpeed) > 0;
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
            ctx.translate(8, 5);
            ctx.fillRect(0, 0, 10, 10);
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(23, -5);
            ctx.lineTo(23, 15);
            ctx.lineTo(8, 10);
            ctx.closePath();
            ctx.fill();
            break;
          case 'scent':
            ctx.beginPath();
            ctx.strokeStyle = item.color || '#000000';
            ctx.lineWidth = 2;
            ctx.arc(17.5, 17.5, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(17.5, 17.5, 8, 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'inflatable': {
            ctx.fillStyle = item.color || '#333';
            const baseWidth = item.inflatableWidth ?? 27.5;
            const baseHeight = item.inflatableLength ?? 17.5;
            let scaleX = baseWidth;
            let scaleY = baseHeight;
            if (item.movement === 'Inflate' || item.movement === 'Deflate') {
              const speed = item.speed || 3;
              const startTime = item.animationStartTime || Date.now();
              const duration = 1000 - speed * 150;
              const elapsed = Math.min((Date.now() - startTime) / duration, 1);
              const targetScale = item.movement === 'Inflate' ? 1.4 : 0.6;
              const scale = item.movement === 'Inflate'
                ? 1 + (targetScale - 1) * elapsed
                : 1 - (1 - targetScale) * elapsed;
              if (elapsed < 1) {
                item.isFlashing = true;
              } else {
                item.isFlashing = false;
              }
              scaleX *= scale;
              scaleY *= scale;
            }
            else if (item.movement === 'Pulse') {
              const speed = item.speed || 3;
              const now = Date.now();
              const pulseScale = 1 + Math.sin(now / (600 - speed * 80)) * 0.2;
              scaleX *= pulseScale;
              scaleY *= pulseScale;
            }
            ctx.beginPath();
            ctx.ellipse(baseWidth, baseHeight, scaleX, scaleY, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
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
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (item.type === 'fur-patch') {
            const originalWidth = 40;
            const centerX = item.position.x + originalWidth / 2;
            const centerY = item.position.y + bounds.height / 2;
            ctx.translate(centerX, centerY);
            const scale = item.size || 1;
            if (scale !== 1) ctx.scale(scale, scale);
            if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
            const halfWidth = bounds.width / 2;
            const halfHeight = bounds.height / 2;
            ctx.strokeStyle = isPrimarySelection ? '#0077ff' : '#00aaff';
            ctx.lineWidth = isPrimarySelection ? 3 : 2;
            ctx.strokeRect(-halfWidth - 5, -halfHeight - 5, bounds.width + 10, bounds.height + 10);
            if (isPrimarySelection && !item.locked) {
              const handleX = 0;
              const handleY = -halfHeight - 15;
              ctx.fillStyle = '#0077ff';
              ctx.beginPath();
              ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
              ctx.fill();
              // Draw line from selection box to rotation handle
              ctx.strokeStyle = '#0077ff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(handleX, handleY + 5);
              ctx.lineTo(handleX, -halfHeight - 5);
              ctx.stroke();
            }
          } else {
            ctx.translate(item.position.x, item.position.y);
            const scale = item.size || 1;
            if (scale !== 1) {
              ctx.translate(bounds.width/2, bounds.height/2);
              ctx.scale(scale, scale);
              ctx.translate(-bounds.width/2, -bounds.height/2);
            }
            if (item.rotation) {
              ctx.translate(bounds.width/2, bounds.height/2);
              ctx.rotate((item.rotation * Math.PI) / 180);
              ctx.translate(-bounds.width/2, -bounds.height/2);
            }
            // Use different colors for primary vs secondary selections
            ctx.strokeStyle = isPrimarySelection ? '#0077ff' : '#00aaff';
            ctx.lineWidth = isPrimarySelection ? 3 : 2;
            ctx.strokeRect(-5, -5, bounds.width + 10, bounds.height + 10);
            // Draw rotation handle only for the primary selected item
            if (isPrimarySelection && !item.locked) {
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
      
      if ((e.ctrlKey || e.metaKey) && !isInputElement(e.target as HTMLElement)) { // Ctrl on Windows/Linux, Cmd on Mac
        if (e.key === 'c' && selectedItems.length > 0) {
          e.preventDefault();
          if (selectedItems.length === 1) {
            copyItem();
            console.log('Element copied:', selectedItems[0].id);
          } else {
            // For multiple items, copy the primary selected item for now
            // TODO: Implement multi-item copy functionality
            copyItem();
            console.log('Multiple elements - copied primary:', primarySelectedItem?.id);
          }
        } else if (e.key === 'v') {
          e.preventDefault();
          pasteItem();
          console.log('Element pasted');
        } else if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'r') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          clearSelection();
          logAction('saved_item', {});
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
            logAction('deleted_item', { itemId: item.id });
          });
          console.log('DELETE COMPLETE: Deleted', selectedItems.length, 'items');
        } else {
          console.log('DELETE KEY: No items selected');
        }
      }

      // Handle arrow keys for item movement
      if (selectedItemId && !isInputElement(e.target as HTMLElement)) {
        const selectedItem = storeItems.find(item => item.id === selectedItemId);
        if (selectedItem) {
          if (selectedItem.locked) return;
          const moveStep = e.shiftKey ? 10 : 1; // Hold shift for larger movements
          let moved = false;
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x - moveStep, 
                y: selectedItem.position.y 
              });
              moved = true;
              break;
            case 'ArrowRight':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x + moveStep, 
                y: selectedItem.position.y 
              });
              moved = true;
              break;
            case 'ArrowUp':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x, 
                y: selectedItem.position.y - moveStep 
              });
              moved = true;
              break;
            case 'ArrowDown':
              e.preventDefault();
              moveItem(selectedItem.id, { 
                x: selectedItem.position.x, 
                y: selectedItem.position.y + moveStep 
              });
              moved = true;
              break;
          }
          if (moved) {
            logAction('moved_item_by_keyboard', { 
              itemId: selectedItem.id, 
              direction: e.key, 
              step: moveStep,
              newPosition: { 
                x: selectedItem.position.x, 
                y: selectedItem.position.y 
              }
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyColor, pasteColor, copyItem, pasteItem, storeItems, selectedItemId, getSelectedItems, moveItem, undo, redo, logAction, clearSelection]);

  // Animation loop for movement effects
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = 0;
    const frameDuration = 1000 / 30; // 30 FPS instead of 60 FPS
    
    const hasAnimatedItems = storeItems.some(item => 
      item.movement && [
        'Shake', 'Flash ind', 'angry', 'pulsing', 'Roll', 'Roll btt',
        'relaxed', 'sad', 'happy', 'Inflate', 'Deflate', 'Pulse'
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
    // Only handle clicks if we're not dragging or rotating
    if (!dragState.isDragging && !rotationState.isRotating && !justCompletedMarquee && !dragState.isMultiSelect) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      
      if (canvas && ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const clickedItem = getItemAtPosition(x, y);
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        
        if (clickedItem) {
          // Handle Ctrl+Click selection here
          handleItemSelection(clickedItem, isCtrlPressed);
        } else if (!isCtrlPressed) {
          if (!rotationState.rotationDone) clearSelection();
        }
      }
    }
    
    // Reset marquee flag
    if (justCompletedMarquee) {
      setJustCompletedMarquee(false);
    }
  }, [getItemAtPosition, handleItemSelection, justCompletedMarquee, rotationState.isRotating, clearSelection, dragState.isDragging, dragState.isMultiSelect]);

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
      if (rotationItem.locked) return;
      saveUndoState();
      const bounds = getItemBounds(rotationItem.type, rotationItem);
      const centerX = rotationItem.position.x + bounds.width / 2;
      const centerY = rotationItem.position.y + bounds.height / 2;
      const startAngle = calculateAngle(centerX, centerY, x, y);
      
      setRotationState({
        isRotating: true,
        rotatingItem: rotationItem,
        startAngle,
        startRotation: rotationItem.rotation || 0,
        hasMoved: false,
        rotationDone: false
      });
      return;
    }
    
    const clickedItem = getItemAtPosition(x, y);
    
    if (clickedItem) {
      if (clickedItem.locked) {
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        handleItemSelection(clickedItem, isCtrlPressed);
        return;
      }
      // If clicking on an already selected item, don't change selection yet
      // (we'll handle selection on mouseUp if no drag occurred)
      const isClickedItemSelected = clickedItem.isSelected || clickedItem.id === selectedItemId;
      
      if (!isClickedItemSelected && !isCtrlPressed) {
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
        hasMoved: false,
        isMultiSelect: isDraggedItemSelected && selectedItems.length > 1
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
      if (rotationState.rotatingItem.locked) return;
      // Handle rotation
      const bounds = getItemBounds(rotationState.rotatingItem.type, rotationState.rotatingItem);
      const leftExpansion = rotationState.rotatingItem.type === 'fur-patch' ? Math.max(0, (bounds.width-40) / 2) : 0;
      const centerX = (rotationState.rotatingItem.position.x-leftExpansion) + bounds.width / 2;
      const centerY = rotationState.rotatingItem.position.y + bounds.height / 2;
      const currentAngle = calculateAngle(centerX, centerY, x, y);
      const rotationChange = currentAngle - rotationState.startAngle;
      const newRotation = rotationState.startRotation + rotationChange;
      if (!rotationState.hasMoved && Math.abs(rotationChange) > 1) {
        setRotationState(prev => ({
          ...prev,
          hasMoved: true
        }));
      }
      updateItem(rotationState.rotatingItem.id, { rotation: newRotation }, { recordUndo: false });
    } else if (dragState.isDragging && dragState.draggedItem) {
      if (dragState.draggedItem.locked) return;
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
        moveItem(itemId, { x: newX, y: newY }, true);
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
    
    // Log final rotation
    if (rotationState.isRotating && rotationState.rotatingItem) {
      if (rotationState.hasMoved) {
        const item = storeItems.find(i => i.id === rotationState.rotatingItem.id);
        if (item) {
          logAction('rotated_item', {
            itemId: item.id,
            newRotation: item.rotation || 0,
            centerPosition: { 
              x: item.position.x + getItemBounds(item.type).width / 2,
              y: item.position.y + getItemBounds(item.type).height / 2
            }
          });
        }
      }
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
        
        // Log dragging movement if significant movement occurred
        if (dragState.hasMoved && distance > 5) {
          const draggedItems = Array.from(dragState.initialPositions.keys());
          const itemPositions = draggedItems.map(itemId => {
            const item = storeItems.find(i => i.id === itemId);
            const initialPos = dragState.initialPositions.get(itemId);
            return {
              itemId,
              startPosition: initialPos,
              endPosition: item?.position
            };
          });

          logAction('moved_items_by_dragging', {
            itemIds: draggedItems,
            isMultiDrag,
            distance: Math.round(distance),
            startPosition: { x: startX, y: startY },
            endPosition: { x, y },
            allItemPositions: itemPositions
          });
        }
        
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
    
    const isMultiSelect = dragState.isMultiSelect;
    setDragState({
      isDragging: false,
      draggedItem: null,
      offset: { x: 0, y: 0 },
      initialPositions: new Map(),
      hasMoved: false,
      isMultiSelect: isMultiSelect
    });
    
    if (isMultiSelect) {
      setTimeout(() => {
        setDragState(prev => ({ ...prev, isMultiSelect: false }));
      }, 100);
    }
    setRotationState(prev => ({
      isRotating: false,
      rotatingItem: null,
      startAngle: 0,
      startRotation: 0,
      hasMoved: false,
      rotationDone: prev.hasMoved
    }));
    if (rotationState.hasMoved) {
      setTimeout(() => {
        setRotationState(prev => ({ ...prev, rotationDone: false }));
      }, 100);
    }
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, [marqueeState, getItemsInRectangle, selectMultipleItems, dragState, storeItems, handleItemSelection, rotationState, logAction, getItemBounds]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={480} //480 *1.15
        height={550} //550
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
