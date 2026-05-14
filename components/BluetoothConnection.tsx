import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import bluetoothCommandService from '@/services/bluetoothCommandService';
import { useScale } from '@/hooks/useScale';

const BLUE_PRIMARY = '#008080';
const BORDER_GRADIENT_START = '#59bfcaff';
const BORDER_GRADIENT_END = '#008080';

interface BluetoothDevice {
  name: string | null;
  address: string;
}

export default function BluetoothConnection() {
  const { sText, sIcon, isLarge } = useScale();
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);

  useEffect(() => {
    loadPairedDevices();
    checkConnection();
  }, []);

  const loadPairedDevices = async () => {
    try {
      setLoading(true);
      const devices = await bluetoothCommandService.listPairedDevices();
      setPairedDevices(devices);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to load paired devices'
      );
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      const connected = await bluetoothCommandService.isConnected();
      setIsConnected(connected);
      if (connected) {
        const deviceName = bluetoothCommandService.getDeviceName();
        setConnectedDevice(deviceName);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    try {
      setLoading(true);
      await bluetoothCommandService.connect();
      setIsConnected(true);
      setConnectedDevice(device.name || device.address);
      Alert.alert('Success', `Connected to ${device.name || device.address}`);
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await bluetoothCommandService.disconnect();
      setIsConnected(false);
      setConnectedDevice(null);
      Alert.alert('Success', 'Disconnected from device');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBluetooth = () => {
    bluetoothCommandService.openBluetoothSettings();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Connection Status Card */}
      <LinearGradient
        colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardWrapper}
      >
        <View style={[styles.cardInner, { padding: isLarge ? 22 : 18 }]}>
          <View style={styles.row}>
            <Ionicons
              name={isConnected ? 'bluetooth' : 'bluetooth-outline'}
              size={sIcon(32)}
              color={isConnected ? '#21A366' : '#999'}
            />
            <View style={[styles.infoBox, { marginLeft: isLarge ? 16 : 12 }]}>
              <Text style={[styles.title, { fontSize: sText(18) }]}>Bluetooth</Text>
              <Text style={[styles.subtitle, { fontSize: sText(14) }]}>
                {isConnected ? `Connected: ${connectedDevice}` : 'Not connected'}
              </Text>
            </View>
            <Ionicons
              name={isConnected ? 'checkmark-circle' : 'alert-circle-outline'}
              size={sIcon(24)}
              color={isConnected ? '#21A366' : '#999'}
            />
          </View>

          {isConnected && (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={sIcon(18)} color="white" />
                  <Text style={[styles.buttonText, { fontSize: sText(14) }]}>
                    Disconnect
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Paired Devices */}
      <View style={[styles.section, { marginTop: isLarge ? 24 : 18 }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { fontSize: sText(16) }]}>
            Available Devices
          </Text>
          <TouchableOpacity onPress={loadPairedDevices} disabled={loading}>
            <Ionicons
              name="refresh"
              size={sIcon(20)}
              color={BLUE_PRIMARY}
              style={{ opacity: loading ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        </View>

        {loading && pairedDevices.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BLUE_PRIMARY} />
            <Text style={[styles.loadingText, { fontSize: sText(14) }]}>
              Loading devices...
            </Text>
          </View>
        ) : pairedDevices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bluetooth-outline" size={sIcon(48)} color="#ccc" />
            <Text style={[styles.emptyText, { fontSize: sText(14) }]}>
              No paired devices found
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleOpenBluetooth}
            >
              <Ionicons name="settings" size={sIcon(18)} color="white" />
              <Text style={[styles.settingsButtonText, { fontSize: sText(12) }]}>
                Open Settings
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.devicesList}>
            {pairedDevices.map((device, index) => (
              <LinearGradient
                key={index}
                colors={['#f9f9f9', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.deviceItem}
              >
                <View style={styles.deviceInfo}>
                  <Ionicons
                    name="radio-button-off"
                    size={sIcon(20)}
                    color={BLUE_PRIMARY}
                  />
                  <View style={{ marginLeft: isLarge ? 12 : 10 }}>
                    <Text style={[styles.deviceName, { fontSize: sText(14) }]}>
                      {device.name || 'Unknown Device'}
                    </Text>
                    <Text style={[styles.deviceAddress, { fontSize: sText(12) }]}>
                      {device.address}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.connectButton, isConnected && styles.disabledButton]}
                  onPress={() => handleConnect(device)}
                  disabled={isConnected || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={[styles.connectButtonText, { fontSize: sText(12) }]}>
                      {isConnected ? 'Connected' : 'Connect'}
                    </Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>
        )}
      </View>

      {/* Instructions Card */}
      <LinearGradient
        colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardWrapper, { marginTop: isLarge ? 24 : 18 }]}
      >
        <View style={[styles.cardInner, { padding: isLarge ? 16 : 14 }]}>
          <Text style={[styles.heading, { fontSize: sText(14) }]}>How to Connect</Text>
          <Text style={[styles.instruction, { fontSize: sText(12) }]}>
            1. Pair your ESP32 device in Bluetooth settings
          </Text>
          <Text style={[styles.instruction, { fontSize: sText(12) }]}>
            2. Return to this screen and tap "Connect"
          </Text>
          <Text style={[styles.instruction, { fontSize: sText(12) }]}>
            3. Device will auto-connect next time
          </Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  cardWrapper: {
    borderRadius: 12,
    padding: 2,
    marginBottom: 16,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  disconnectButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyText: {
    color: '#999',
    marginTop: 12,
  },
  settingsButton: {
    flexDirection: 'row',
    backgroundColor: '#008080',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 12,
    gap: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  devicesList: {
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceName: {
    fontWeight: '500',
    color: '#000',
  },
  deviceAddress: {
    color: '#999',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#008080',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  connectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  heading: {
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  instruction: {
    color: '#666',
    marginVertical: 4,
    lineHeight: 18,
  },
});
