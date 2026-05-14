/**
 * ESP Command Service
 * 
 * Handles direct WiFi communication with ESP32 device
 * Supports:
 * - Auto-discovery via mDNS (vista-iot.local)
 * - Direct IP fallback
 * - Command execution with instant response
 * - Device state tracking
 * - Firebase history logging (async)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import bluetoothCommandService from './bluetoothCommandService';

export interface DeviceState {
  fan1_speed: number;
  fan2_speed: number;
  servo_angle: number;
  bulb1: boolean;
  bulb2: boolean;
  tv: boolean;
  timestamp: number;
}

export interface CommandResponse {
  success: boolean;
  message: string;
  device_states: DeviceState;
}

export type ConnectionTransport = 'wifi' | 'bluetooth' | 'none';

export interface ConnectionResult {
  type: Exclude<ConnectionTransport, 'none'>;
  deviceState: DeviceState | null;
}

class ESPCommandService {
  private deviceUrl: string | null = null;
  private discoveredIP: string | null = null;
  private requestTimeout: number = 5000; // 5 second timeout
  private lastResponse: DeviceState | null = null;
  private activeTransport: ConnectionTransport = 'none';
  
  constructor() {
    this.loadStoredIP();
  }

  /**
   * Load previously discovered device IP from storage
   */
  private async loadStoredIP() {
    try {
      const stored = await AsyncStorage.getItem('esp_device_ip');
      if (stored) {
        this.discoveredIP = stored;
        this.deviceUrl = `http://${stored}:8080`;
        console.log('[ESP Service] Loaded stored IP:', stored);
      }
    } catch (error) {
      console.error('[ESP Service] Error loading stored IP:', error);
    }
  }

  /**
   * Discover device using mDNS (vista-iot.local)
   * This is the primary discovery method
   */
  async discoverDevice(): Promise<string> {
    console.log('[ESP Service] Attempting discovery...');

    // Try mDNS hostname first
    const mdnsUrl = 'http://vista-iot.local:8080';
    
    try {
      const response = await this.fetchWithTimeout(mdnsUrl, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.device === 'Vista-IoT') {
          this.deviceUrl = mdnsUrl;
          this.activeTransport = 'wifi';
          console.log('[ESP Service] Device discovered via mDNS: vista-iot.local');
          return mdnsUrl;
        }
      }
    } catch (error) {
      console.warn('[ESP Service] mDNS discovery failed, trying stored IP...');
    }

    // Fallback to stored IP
    if (this.discoveredIP) {
      try {
        const ipUrl = `http://${this.discoveredIP}:8080`;
        const response = await this.fetchWithTimeout(ipUrl, {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.device === 'Vista-IoT') {
            this.deviceUrl = ipUrl;
            this.activeTransport = 'wifi';
            console.log('[ESP Service] Device found at stored IP:', this.discoveredIP);
            return ipUrl;
          }
        }
      } catch (error) {
        console.warn('[ESP Service] Stored IP not responding');
        await AsyncStorage.removeItem('esp_device_ip');
        this.discoveredIP = null;
      }
    }

    throw new Error('Device not found. Ensure ESP32 is connected to WiFi and on the same network.');
  }

  /**
   * Connect using WiFi first, then Bluetooth Serial as fallback.
   */
  async connect(): Promise<ConnectionResult> {
    try {
      await this.discoverDevice();
      const status = await this.getDeviceStatus();
      this.activeTransport = 'wifi';
      return { type: 'wifi', deviceState: status };
    } catch (wifiError) {
      console.warn('[ESP Service] WiFi unavailable, trying Bluetooth...', wifiError);
    }

    try {
      await bluetoothCommandService.connect();
      const status = await bluetoothCommandService.getStatus();
      this.lastResponse = status;
      this.activeTransport = 'bluetooth';
      return { type: 'bluetooth', deviceState: status };
    } catch (bluetoothError) {
      this.activeTransport = 'none';
      throw new Error(
        bluetoothError instanceof Error
          ? bluetoothError.message
          : 'Device not connected by WiFi or Bluetooth'
      );
    }
  }

  /**
   * Send command to device
   * Returns instantly with device state
   */
  async sendCommand(action: string): Promise<CommandResponse> {
    if (this.activeTransport === 'bluetooth') {
      try {
        const data = await bluetoothCommandService.sendCommand(action);
        if (data.device_states) {
          this.lastResponse = data.device_states;
        }
        return data;
      } catch (error) {
        console.warn('[ESP Service] Bluetooth command failed, trying WiFi...', error);
        this.activeTransport = 'none';
      }
    }

    if (!this.deviceUrl) {
      // Try to discover device first
      try {
        await this.discoverDevice();
      } catch (error) {
        console.warn('[ESP Service] WiFi unavailable, trying Bluetooth command...', error);
        const data = await bluetoothCommandService.sendCommand(action);
        if (data.device_states) {
          this.lastResponse = data.device_states;
        }
        this.activeTransport = 'bluetooth';
        return data;
      }
    }

    try {
      const commandUrl = `${this.deviceUrl}/cmd`;
      
      console.log(`[ESP Service] Sending command: ${action}`);

      const response = await this.fetchWithTimeout(commandUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: CommandResponse = await response.json();

      // Cache the device state
      if (data.device_states) {
        this.lastResponse = data.device_states;
      }
      this.activeTransport = 'wifi';

      console.log('[ESP Service] Command successful:', data.message);
      return data;
    } catch (error) {
      console.error('[ESP Service] Command failed:', error);
      
      // On failure, try to rediscover device
      this.deviceUrl = null;
      this.activeTransport = 'none';

      try {
        const data = await bluetoothCommandService.sendCommand(action);
        if (data.device_states) {
          this.lastResponse = data.device_states;
        }
        this.activeTransport = 'bluetooth';
        return data;
      } catch (bluetoothError) {
        console.error('[ESP Service] Bluetooth fallback failed:', bluetoothError);
      }
      
      throw new Error(
        error instanceof Error
          ? `Command failed: ${error.message}`
          : 'Command failed: Unknown error'
      );
    }
  }

  /**
   * Get device status without sending a command
   */
  async getDeviceStatus(): Promise<DeviceState> {
    if (this.activeTransport === 'bluetooth') {
      return bluetoothCommandService.getStatus();
    }

    if (!this.deviceUrl) {
      try {
        await this.discoverDevice();
      } catch (error) {
        try {
          const status = await bluetoothCommandService.getStatus();
          this.activeTransport = 'bluetooth';
          this.lastResponse = status;
          return status;
        } catch {
          throw new Error('Device not connected');
        }
      }
    }

    try {
      const statusUrl = `${this.deviceUrl}/status`;

      const response = await this.fetchWithTimeout(statusUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: DeviceState = await response.json();
      this.lastResponse = data;
      this.activeTransport = 'wifi';

      console.log('[ESP Service] Status fetched successfully');
      return data;
    } catch (error) {
      console.error('[ESP Service] Status fetch failed:', error);
      this.deviceUrl = null;
      this.activeTransport = 'none';

      try {
        const status = await bluetoothCommandService.getStatus();
        this.activeTransport = 'bluetooth';
        this.lastResponse = status;
        return status;
      } catch (bluetoothError) {
        console.warn('[ESP Service] Bluetooth status fallback failed:', bluetoothError);
      }

      // Return cached state if available
      if (this.lastResponse) {
        console.log('[ESP Service] Returning cached state');
        return this.lastResponse;
      }

      throw new Error('Failed to get device status');
    }
  }

  /**
   * Check if device is reachable
   */
  async isDeviceConnected(): Promise<boolean> {
    if (this.activeTransport === 'bluetooth') {
      return bluetoothCommandService.isConnected();
    }

    try {
      if (!this.deviceUrl) {
        // Try discovery without throwing
        try {
          await this.discoverDevice();
        } catch {
          return false;
        }
      }

      const response = await this.fetchWithTimeout(`${this.deviceUrl}`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      this.deviceUrl = null;
      this.activeTransport = 'none';
      return false;
    }
  }

  /**
   * Store device IP for faster reconnection
   */
  async storeDeviceIP(ip: string) {
    try {
      this.discoveredIP = ip;
      this.deviceUrl = `http://${ip}:8080`;
      this.activeTransport = 'wifi';
      await AsyncStorage.setItem('esp_device_ip', ip);
      console.log('[ESP Service] Stored device IP:', ip);
    } catch (error) {
      console.error('[ESP Service] Error storing device IP:', error);
    }
  }

  /**
   * Get current device URL
   */
  getDeviceUrl(): string | null {
    return this.deviceUrl;
  }

  getActiveTransport(): ConnectionTransport {
    return this.activeTransport;
  }

  /**
   * Get last cached device state
   */
  getLastState(): DeviceState | null {
    return this.lastResponse;
  }

  /**
   * Clear cached device info
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem('esp_device_ip');
      this.deviceUrl = null;
      this.discoveredIP = null;
      this.lastResponse = null;
      this.activeTransport = 'none';
      console.log('[ESP Service] Cache cleared');
      await bluetoothCommandService.clearCache();
    } catch (error) {
      console.error('[ESP Service] Error clearing cache:', error);
    }
  }

  async disconnect() {
    this.deviceUrl = null;
    this.activeTransport = 'none';
    await bluetoothCommandService.disconnect();
  }

  /**
   * Helper: Fetch with timeout
   */
  private fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = this.requestTimeout
  ): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }
}

// Export singleton instance
export const espCommandService = new ESPCommandService();
export default espCommandService;
