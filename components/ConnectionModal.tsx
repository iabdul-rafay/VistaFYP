/**
 * Connection Modal Component
 * 
 * Quick access to pair Bluetooth devices or switch WiFi
 * Shows both Bluetooth and WiFi options
 */

import { useScale } from '@/hooks/useScale';
import bluetoothCommandService from '@/services/bluetoothCommandService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  isBluetoothConnected: boolean;
  connectionType: string;
  connectedDeviceName: string | null;
}

interface BluetoothDevice {
  name: string | null;
  address: string;
}

const BLUE_PRIMARY = '#008080';
const BUTTON_GRADIENT_START = '#00C4CC';
const BUTTON_GRADIENT_END = '#008080';
const BORDER_GRADIENT_START = '#59bfcaff';
const BORDER_GRADIENT_END = '#008080';

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  visible,
  onClose,
  isBluetoothConnected,
  connectionType,
  connectedDeviceName,
}) => {
  const { sText, sIcon } = useScale();
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPairedDevices();
    }
  }, [visible]);

  const loadPairedDevices = async () => {
    try {
      setLoading(true);
      const devices = await bluetoothCommandService.listPairedDevices();
      setPairedDevices(devices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    try {
      setScanning(true);
      await bluetoothCommandService.connect();
      Alert.alert('Success', `Connected to ${device.name || device.address}`);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Failed to connect'
      );
    } finally {
      setScanning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setScanning(true);
      await bluetoothCommandService.disconnect();
      Alert.alert('Success', 'Disconnected from device');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect');
    } finally {
      setScanning(false);
    }
  };

  const handleOpenSettings = () => {
    bluetoothCommandService.openBluetoothSettings();
  };

  const handleRefresh = () => {
    loadPairedDevices();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: sText(24) }]}>Connection</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={sIcon(28)} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* WiFi Connection Card */}
            <LinearGradient
              colors={['#ffffff', '#f9f9f9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectionCard}
            >
              <View style={styles.connectionHeader}>
                <View style={styles.connectionIcon}>
                  <Ionicons name="wifi" size={sIcon(28)} color={BLUE_PRIMARY} />
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={[styles.connectionTitle, { fontSize: sText(16) }]}>
                    WiFi Connection
                  </Text>
                  <Text style={[styles.connectionStatus, { fontSize: sText(12) }]}>
                    {connectionType === 'wifi' ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
                {connectionType === 'wifi' && (
                  <Ionicons name="checkmark-circle" size={sIcon(24)} color="#4CAF50" />
                )}
              </View>
              {connectionType === 'wifi' && (
                <View style={styles.connectedDevice}>
                  <Ionicons name="router" size={sIcon(16)} color={BLUE_PRIMARY} />
                  <Text style={[styles.deviceText, { fontSize: sText(12) }]}>
                    {connectedDeviceName || 'Home Network'}
                  </Text>
                </View>
              )}
              <Text style={[styles.hint, { fontSize: sText(11) }]}>
                Your ESP32 is connected via WiFi network
              </Text>
            </LinearGradient>

            {/* Bluetooth Connection Card */}
            <LinearGradient
              colors={['#ffffff', '#f9f9f9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectionCard}
            >
              <View style={styles.connectionHeader}>
                <View style={styles.connectionIcon}>
                  <Ionicons
                    name={isBluetoothConnected ? 'bluetooth' : 'bluetooth-outline'}
                    size={sIcon(28)}
                    color={isBluetoothConnected ? '#21A366' : '#999'}
                  />
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={[styles.connectionTitle, { fontSize: sText(16) }]}>
                    Bluetooth Connection
                  </Text>
                  <Text style={[styles.connectionStatus, { fontSize: sText(12) }]}>
                    {isBluetoothConnected ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
                {isBluetoothConnected && (
                  <Ionicons name="checkmark-circle" size={sIcon(24)} color="#4CAF50" />
                )}
              </View>

              {isBluetoothConnected && (
                <>
                  <View style={styles.connectedDevice}>
                    <Ionicons name="radio-button-on" size={sIcon(16)} color="#21A366" />
                    <Text style={[styles.deviceText, { fontSize: sText(12) }]}>
                      {connectedDeviceName || 'Connected Device'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={handleDisconnect}
                    disabled={scanning}
                  >
                    {scanning ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={sIcon(16)} color="#fff" />
                        <Text style={[styles.disconnectText, { fontSize: sText(12) }]}>
                          Disconnect
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {!isBluetoothConnected && (
                <View style={styles.devicesList}>
                  <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { fontSize: sText(12) }]}>
                      Available Devices
                    </Text>
                    <TouchableOpacity onPress={handleRefresh} disabled={loading}>
                      <Ionicons
                        name="refresh"
                        size={sIcon(16)}
                        color={BLUE_PRIMARY}
                        style={{ opacity: loading ? 0.5 : 1 }}
                      />
                    </TouchableOpacity>
                  </View>

                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={BLUE_PRIMARY} />
                      <Text style={[styles.loadingText, { fontSize: sText(11) }]}>
                        Loading...
                      </Text>
                    </View>
                  ) : pairedDevices.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={[styles.emptyText, { fontSize: sText(11) }]}>
                        No paired devices found
                      </Text>
                      <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={handleOpenSettings}
                      >
                        <Ionicons name="settings" size={sIcon(14)} color="#fff" />
                        <Text style={[styles.settingsText, { fontSize: sText(10) }]}>
                          Pair Device
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    pairedDevices.map((device, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.deviceItem}
                        onPress={() => handleConnect(device)}
                        disabled={scanning}
                      >
                        <View style={styles.deviceItemContent}>
                          <Ionicons name="radio-button-off" size={sIcon(16)} color={BLUE_PRIMARY} />
                          <View style={styles.deviceItemText}>
                            <Text style={[styles.deviceName, { fontSize: sText(12) }]}>
                              {device.name || 'Unknown'}
                            </Text>
                            <Text style={[styles.deviceAddr, { fontSize: sText(10) }]}>
                              {device.address}
                            </Text>
                          </View>
                        </View>
                        {scanning ? (
                          <ActivityIndicator size="small" color={BLUE_PRIMARY} />
                        ) : (
                          <Ionicons name="arrow-forward" size={sIcon(16)} color={BLUE_PRIMARY} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </LinearGradient>

            {/* Info Card */}
            <LinearGradient
              colors={['#f0f9ff', '#e6f7ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCard}
            >
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={sIcon(20)} color={BLUE_PRIMARY} />
                <Text style={[styles.infoTitle, { fontSize: sText(13) }]}>Quick Tip</Text>
              </View>
              <Text style={[styles.infoText, { fontSize: sText(11) }]}>
                Use WiFi for faster response times, or Bluetooth for direct control without router
              </Text>
            </LinearGradient>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { fontSize: sText(14) }]}>Close</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  connectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionTitle: {
    fontWeight: '600',
    color: '#333',
  },
  connectionStatus: {
    color: '#666',
    marginTop: 2,
  },
  connectedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  deviceText: {
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  disconnectText: {
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    color: '#999',
    marginTop: 8,
  },
  devicesList: {
    marginTop: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    color: '#999',
  },
  settingsBtn: {
    flexDirection: 'row',
    backgroundColor: '#008080',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
  },
  settingsText: {
    color: '#fff',
    fontWeight: '600',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceItemText: {
    marginLeft: 10,
    flex: 1,
  },
  deviceName: {
    fontWeight: '500',
    color: '#333',
  },
  deviceAddr: {
    color: '#999',
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontWeight: '600',
    color: '#008080',
    marginLeft: 8,
  },
  infoText: {
    color: '#333',
    lineHeight: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ConnectionModal;
