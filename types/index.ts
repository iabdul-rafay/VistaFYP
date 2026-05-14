export interface Device {
  id: string;
  name: string;
  type: 'bulb' | 'tube-light' | 'fan' | 'ac' | 'other';
  status: 'online' | 'offline';
  details?: string;
}

export interface CommandHistory {
  id: string;
  command: string;
  device: string;
  timestamp: string;
  status: 'success' | 'failed';
}