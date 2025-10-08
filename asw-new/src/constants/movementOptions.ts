import type { WearableItem } from '../types';

export interface MovementOption {
  id: string;
  value: WearableItem['movement'];
  label: string;
}

export const MOVEMENT_OPTIONS: Record<string, MovementOption[]> = {
  'fur-patch': [
    { id: 'shake', value: 'Shake', label: 'Shake' },
    { id: 'roll', value: 'Roll', label: 'Roll Down' },
    { id: 'roll-btt', value: 'Roll btt', label: 'Roll Up' },
    { id: 'stick-up', value: 'Stick up', label: 'Stick up' },
  ],
  'light-ind': [
    { id: 'light-on', value: 'Light on ind', label: 'Light on' },
    { id: 'flash', value: 'Flash ind', label: 'Flash' },
  ],
  'light-strip': [
    { id: 'scared', value: 'scared', label: 'Light on' },
    { id: 'angry', value: 'angry', label: 'Flash' },
    { id: 'relaxed', value: 'relaxed', label: 'Trickle up' },
    { id: 'sad', value: 'sad', label: 'Trickle down' },
    { id: 'happy', value: 'happy', label: 'Random flash' },
  ],
  'inflatable': [
    { id: 'inflate', value: 'Inflate', label: 'Inflate' },
    { id: 'deflate', value: 'Deflate', label: 'Deflate' },
    { id: 'pulse', value: 'Pulse', label: 'Pulse' },
  ],
  'speaker': [
    { id: 'continuous', value: 'Continuous', label: 'Continuous' },
    { id: 'discontinuous', value: 'Discontinuous', label: 'Discrete' },
  ],
  'scent': [
    { id: 'continuous', value: 'Continuous', label: 'Continuous' },
    { id: 'discontinuous', value: 'Discontinuous', label: 'Discrete' },
  ],
  'display': [],
  'other': [], // Special case - shows text input instead
};
