import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import type { CommandResponse, DeviceState } from './espCommandService';

const STORED_DEVICE_ADDRESS_KEY = 'esp_bluetooth_device_address';
const KNOWN_DEVICE_NAMES = ['vista-iot', 'vista iot', 'Vista-IoT', 'ESP32', 'HC-05', 'HC-06'];
const CONNECT_OPTIONS = {
  CONNECTOR_TYPE: 'rfcomm',
  DELIMITER: '\n',
  DEVICE_CHARSET: 'utf-8',
};

const emptyDeviceState: DeviceState = {
  fan1_speed: 0,
  fan2_speed: 0,
  servo_angle: 90,
  bulb1: false,
  bulb2: false,
  tv: false,
  timestamp: 0,
};

class BluetoothCommandService {
  private device: BluetoothDevice | null = null;
  private storedAddress: string | null = null;
  private lastResponse: DeviceState | null = null;

  constructor() {
    this.loadStoredAddress();
  }

  private async loadStoredAddress() {
    try {
      this.storedAddress = await AsyncStorage.getItem(STORED_DEVICE_ADDRESS_KEY);
    } catch (error) {
      console.warn('[Bluetooth Service] Failed to load stored device address:', error);
    }
  }

  private async requestAndroidPermissions() {
    if (Platform.OS !== 'android') {
      throw new Error('Bluetooth control is only supported on Android APK builds');
    }

    const permissions =
      Number(Platform.Version) >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const results = await PermissionsAndroid.requestMultiple(permissions);
    const denied = permissions.filter(
      (permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED
    );

    if (denied.length > 0) {
      throw new Error('Bluetooth permission denied');
    }
  }

  private async ensureBluetoothReady() {
    await this.requestAndroidPermissions();

    const available = await RNBluetoothClassic.isBluetoothAvailable();
    if (!available) {
      throw new Error('This phone does not support Bluetooth');
    }

    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) {
      const enabledByUser = await RNBluetoothClassic.requestBluetoothEnabled();
      if (!enabledByUser) {
        throw new Error('Bluetooth is turned off');
      }
    }
  }

  private findKnownDevice(devices: BluetoothDevice[]) {
    if (this.storedAddress) {
      const stored = devices.find((device) => device.address === this.storedAddress);
      if (stored) return stored;
    }

    return devices.find((device) => {
      const name = (device.name || '').trim();
      return KNOWN_DEVICE_NAMES.some(
        (knownName) => name.toLowerCase() === knownName.toLowerCase()
      );
    });
  }

  async listPairedDevices(): Promise<BluetoothDevice[]> {
    await this.ensureBluetoothReady();
    return RNBluetoothClassic.getBondedDevices();
  }

  async connect(): Promise<BluetoothDevice> {
    await this.ensureBluetoothReady();

    if (this.device) {
      const connected = await this.device.isConnected().catch(() => false);
      if (connected) return this.device;
    }

    const pairedDevices = await RNBluetoothClassic.getBondedDevices();
    const selectedDevice = this.findKnownDevice(pairedDevices);

    if (!selectedDevice) {
      throw new Error('Pair ESP32 Bluetooth device named "vista-iot" in Android settings first');
    }

    const alreadyConnected = await selectedDevice.isConnected().catch(() => false);
    if (!alreadyConnected) {
      await selectedDevice.connect(CONNECT_OPTIONS as any);
    }

    this.device = selectedDevice;
    this.storedAddress = selectedDevice.address;
    await AsyncStorage.setItem(STORED_DEVICE_ADDRESS_KEY, selectedDevice.address);

    console.log('[Bluetooth Service] Connected to:', selectedDevice.name || selectedDevice.address);
    return selectedDevice;
  }

  async disconnect() {
    if (!this.device) return;

    try {
      const connected = await this.device.isConnected();
      if (connected) {
        await this.device.disconnect();
      }
    } catch (error) {
      console.warn('[Bluetooth Service] Disconnect failed:', error);
    } finally {
      this.device = null;
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.device) return false;
    return this.device.isConnected().catch(() => false);
  }

  async sendCommand(action: string): Promise<CommandResponse> {
    const device = await this.connect();

    try {
      await device.clear().catch(() => false);
      await device.write(`${action}\n`, 'utf-8');

      const responseText = await this.readResponse(device);
      const response = this.parseResponse(responseText, action);

      if (response.device_states) {
        this.lastResponse = response.device_states;
      }

      return response;
    } catch (error) {
      this.device = null;
      throw new Error(
        error instanceof Error
          ? `Bluetooth command failed: ${error.message}`
          : 'Bluetooth command failed'
      );
    }
  }

  async getStatus(): Promise<DeviceState> {
    const response = await this.sendCommand('STATUS');
    return response.device_states || this.lastResponse || emptyDeviceState;
  }

  async clearCache() {
    this.device = null;
    this.storedAddress = null;
    this.lastResponse = null;
    await AsyncStorage.removeItem(STORED_DEVICE_ADDRESS_KEY);
  }

  openBluetoothSettings() {
    RNBluetoothClassic.openBluetoothSettings();
  }

  getDeviceName(): string | null {
    return this.device?.name || this.device?.address || null;
  }

  private async readResponse(device: BluetoothDevice): Promise<string> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 2500) {
      const available = await device.available().catch(() => 0);
      if (Number(available) > 0) {
        const message = await device.read();
        return String(message || '').trim();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return '';
  }

  private parseResponse(responseText: string, action: string): CommandResponse {
    const cleanText = responseText.replace(/^\[BT\]\s*/i, '').trim();

    if (cleanText.startsWith('{')) {
      try {
        return JSON.parse(cleanText) as CommandResponse;
      } catch (error) {
        console.warn('[Bluetooth Service] Failed to parse JSON response:', error);
      }
    }

    const success =
      cleanText.length === 0 ||
      (!cleanText.toLowerCase().includes('unknown') &&
        !cleanText.toLowerCase().includes('failed'));

    return {
      success,
      message: cleanText || `Bluetooth command sent: ${action}`,
      device_states: this.lastResponse || emptyDeviceState,
    };
  }
}

export const bluetoothCommandService = new BluetoothCommandService();
export default bluetoothCommandService;
