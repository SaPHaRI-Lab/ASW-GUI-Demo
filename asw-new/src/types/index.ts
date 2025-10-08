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

export type ItemType = 'fur-patch' | 'light-ind' | 'light-strip' | 'inflatable' | 'battery' | 'display' | 'speaker' | 'scent' | 'other';

export type MovementType = 
  | 'Shake' | 'Roll' | 'Roll btt' | 'Stick up' // fur-patch
  | 'Light on ind' | 'Flash ind' // light-ind
  | 'scared' | 'angry' | 'relaxed' | 'sad' | 'happy' // light-strip
  | 'Continuous' | 'Discontinuous' // speaker
  | 'Inflate' | 'Deflate' | 'Pulse' // inflatable
  | 'static' | 'rotating' | 'pulsing' | 'blinking'; // general

export interface WearableItem {
  id: string;
  type: ItemType;
  position: Position;
  color: string;
  baseColor?: string;
  gradient?: number;
  movement: MovementType;
  speed: number;
  customName?: string;
  cyoName?: string;
  customInput?: string;
  isSelected: boolean;
  isFlashing: boolean;
  flashingColor?: string;
  view: 'front' | 'back';
  zIndex: number;
  rotation?: number; // Rotation angle in degrees
  size?: number;
  amount?: number;
  length?: number; // Length for light strip
  verticalRows?: number; // Vertical rows for fur patch
  inflatableLength?: number; // Length for inflatable
  inflatableWidth?: number; // Width for inflatable
  animationStartTime?: number;
  locked?: boolean; // If true, item cannot be moved or rotated
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
  waitPopupTime?: number;
  isActive: boolean;
}

export interface ApplicationState {
  items: WearableItem[];
  selectedItemId: string | null;
  colorSelection: ColorSelection;
  jacketConfig: JacketConfig;
  sessionInfo: SessionInfo;
  flashingItems: Set<string>;
  itemCounters: Record<string, number>;
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
