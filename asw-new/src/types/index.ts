// Core application types

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface Position {
  x: number;
  y: number;
}

export type ItemType = 'fur-patch' | 'light-ind' | 'light-strip' | 'battery' | 'display' | 'speaker' | 'other';

export type MovementType = 
  | 'Shake' | 'Roll' | 'Stick up' | 'Both' // fur-patch
  | 'Light on ind' | 'Flash ind' // light-ind
  | 'Light on str' | 'Flash str' | 'Trickle up' | 'Trickle down' | 'Random fl' // light-strip
  | 'Continuous' | 'Discontinuous' // speaker
  | 'static' | 'rotating' | 'pulsing' | 'blinking'; // general

export interface WearableItem {
  id: string;
  type: ItemType;
  position: Position;
  color: string;
  movement: MovementType;
  speed: number;
  customName?: string;
  cyoName?: string;
  isSelected: boolean;
  isFlashing: boolean;
  flashingColor?: string;
  view: 'front' | 'back';
  zIndex: number;
}

export interface ColorSelection {
  rgba: RGBA;
  position: Position;
  gradient: number;
}

export interface JacketConfig {
  view: 'front' | 'back';
  color: RGB;
  colorPosition: Position | null;
  gradient: number;
}

export interface SessionInfo {
  participantId: string;
  designCode: string;
  startTime: number;
  isActive: boolean;
}

export interface ApplicationState {
  items: WearableItem[];
  selectedItemId: string | null;
  colorSelection: ColorSelection;
  jacketConfig: JacketConfig;
  sessionInfo: SessionInfo;
  flashingItems: Set<string>;
}

export interface ActionLog {
  type: string;
  data: any;
  timestamp: number;
}

export interface ItemSelections {
  [itemId: string]: {
    movement: string | null;
    speed: number;
    customInput: string;
    color: string;
    colorX: number;
    colorY: number;
    gradient: number;
    cyoName?: string;
  };
}
