import type { WearableItem } from '../types';

export interface MovementOption {
  id: string;
  value: WearableItem['movement'];
  label: string;
}

export const MOVEMENT_OPTIONS: Record<string, MovementOption[]> = {
  'fur-patch': [
    { id: 'shake', value: 'Shake', label: 'Shake' },
    { id: 'roll', value: 'Roll', label: 'Roll (top to bottom)' },
    { id: 'roll-btt', value: 'Roll btt', label: 'Roll (bottom to top)' },
    { id: 'stick-up', value: 'Stick up', label: 'Stick up' },
    { id: 'both', value: 'Both', label: 'Rattle' },
  ],
  'light-ind': [
    { id: 'light-on', value: 'Light on ind', label: 'Light on' },
    { id: 'flash', value: 'Flash ind', label: 'Flash' },
  ],
  'light-strip': [
    { id: 'light-on-str', value: 'Light on str', label: 'Light on' },
    { id: 'flash-str', value: 'Flash str', label: 'Flash' },
    { id: 'trickle-up', value: 'Trickle up', label: 'Trickle up' },
    { id: 'trickle-down', value: 'Trickle down', label: 'Trickle down' },
    { id: 'random-fl', value: 'Random fl', label: 'Random flash' },
  ],
  'inflatable': [
    { id: 'inflate', value: 'Inflate', label: 'Inflate' },
    { id: 'deflate', value: 'Deflate', label: 'Deflate' },
    { id: 'pulse', value: 'Pulse', label: 'Pulse' },
  ],
  'speaker': [
    { id: 'continuous', value: 'Continuous', label: 'Continuous' },
    { id: 'discontinuous', value: 'Discontinuous', label: 'Discontinuous' },
  ],
  'scent': [
    { id: 'continuous', value: 'Continuous', label: 'Continuous' },
    { id: 'discontinuous', value: 'Discontinuous', label: 'Discontinuous' },
  ],
  'display': [],
  'other': [], // Special case - shows text input instead
};
