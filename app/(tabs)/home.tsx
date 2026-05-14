import { useSettings } from '@/context/settingsContext';
import useEspConnection from '@/hooks/useEspConnection';
import { useScale } from '@/hooks/useScale';
import useVoiceControl from '@/hooks/useVoiceControl';
import espCommandService from '@/services/espCommandService';
import { VoiceCommand } from '@/services/voiceCommandService';
import { LinearGradient } from 'expo-linear-gradient';
import { onValue, ref } from 'firebase/database';
import { FC, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ConnectionModal from '../../components/ConnectionModal';
import DeviceCard from '../../components/DeviceCard';
import PageHeader from '../../components/PageHeader';
import { VoiceCommandsList } from '../../components/VoiceCommandsList';
import { VoiceControlModal } from '../../components/VoiceControlModal';
import { database } from '../../services/firebase';

const BLUE_PRIMARY = '#008080';

const Dashboard: FC = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDevice, setLoadingDevice] = useState<string | null>(null);
    
    // --- Toast Animation State ---
    const [toastMsg, setToastMsg] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Connection Modal State
    const [connectionModalVisible, setConnectionModalVisible] = useState(false);
    const [voiceModalVisible, setVoiceModalVisible] = useState(false);
    const [voiceCommandsListVisible, setVoiceCommandsListVisible] = useState(false);

    const { sText, sIcon } = useScale();
    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    const voiceControl = useVoiceControl(openaiApiKey);
    const espConnection = useEspConnection(true);
    const { addHistoryItem } = useSettings();

    useEffect(() => {
        const dbRef = ref(database, 'vista_iot');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const mappedDevices: any[] = [
                    { 
                        id: 'bulb1', path: 'relays/bulb1', name: 'Bulb 1', type: 'bulb', 
                        status: data.relays?.bulb1 ? 'online' : 'offline', 
                        details: data.relays?.bulb1 ? 'Active' : 'Inactive', value: data.relays?.bulb1 
                    },
                    { 
                        id: 'bulb2', path: 'relays/bulb2', name: 'Bulb 2', type: 'tube-light', 
                        status: data.relays?.bulb2 ? 'online' : 'offline', 
                        details: data.relays?.bulb2 ? 'Active' : 'Inactive', value: data.relays?.bulb2 
                    },
                    { 
                        id: 'fan1_speed', path: 'fans/fan1_speed', name: 'Fan 1', type: 'fan', 
                        status: data.fans?.fan1_speed > 0 ? 'online' : 'offline', 
                        details: `Speed: ${data.fans?.fan1_speed || 0}%`, 
                        value: data.fans?.fan1_speed,
                        memoryValue: data.fans?.fan1_speed_memory || 50 
                    },
                    { 
                        id: 'fan2_speed', path: 'fans/fan2_speed', name: 'Fan 2', type: 'fan', 
                        status: data.fans?.fan2_speed > 0 ? 'online' : 'offline', 
                        details: `Speed: ${data.fans?.fan2_speed || 0}%`, 
                        value: data.fans?.fan2_speed,
                        memoryValue: data.fans?.fan2_speed_memory || 50 
                    },
                    { 
                        id: 'angle', path: 'servo/angle', name: 'Main Gate', type: 'main gate', 
                        status: data.servo?.angle > 0 ? 'online' : 'offline', 
                        details: data.servo?.angle > 0 ? `Open (${data.servo?.angle}°)` : 'Closed', value: data.servo?.angle 
                    }
                ];
                setDevices(mappedDevices);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const triggerToast = (message: string) => {
        setToastMsg(message);
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true })
        ]).start(() => setToastMsg(''));
    };

    const updateSpeed = async (device: any, increment: boolean) => {
        if (!espConnection.isConnected) {
            triggerToast("Device not connected");
            return;
        }

        const currentVal = Number(device.value) || 30;
        let newVal = increment ? currentVal + 10 : currentVal - 10;
        if (newVal > 100) newVal = 100;
        if (newVal < 30) newVal = 30; 
        if (newVal === currentVal) return;

        try {
            setLoadingDevice(device.id);
            
            // Determine command based on device type
            let action = "";
            if (device.id === 'fan1_speed') {
                action = `FAN1:${newVal}`;
            } else if (device.id === 'fan2_speed') {
                action = `FAN2:${newVal}`;
            }

            if (!action) {
                triggerToast("Unknown device");
                return;
            }

            // Send command to ESP32 (instant execution)
            const response = await espCommandService.sendCommand(action);
            
            if (response.success) {
                addHistoryItem(`${device.name} speed set to ${newVal}%`, "Manual Control", 'speedometer-outline');
                triggerToast(`${device.name} speed: ${newVal}%`);
                
                // Update local device state from response
                setDevices(prevDevices => 
                    prevDevices.map(d => 
                        d.id === device.id 
                            ? { ...d, value: newVal, details: `Speed: ${newVal}%` }
                            : d
                    )
                );
            } else {
                triggerToast("Command failed: " + response.message);
            }
        } catch (error) {
            triggerToast("Error: " + (error instanceof Error ? error.message : 'Unknown error'));
            console.error('Speed update error:', error);
        } finally {
            setLoadingDevice(null);
        }
    };

    const handleToggle = async (device: any) => {
        if (!espConnection.isConnected) {
            triggerToast("Device not connected");
            return;
        }

        try {
            setLoadingDevice(device.id);
            let action = "";
            let newVal: any;
            let statusLabel = "";

            if (device.path === 'servo/angle') {
                newVal = device.value === 0 ? 90 : 0;
                action = `SERVO:${newVal}`;
                statusLabel = newVal === 90 ? "Opened" : "Closed";
            } else if (device.path.includes('relays')) {
                newVal = !device.value;
                statusLabel = newVal ? 'Turned ON' : 'Turned OFF';
                
                if (device.id === 'bulb1') {
                    action = newVal ? 'BULB1:ON' : 'BULB1:OFF';
                } else if (device.id === 'bulb2') {
                    action = newVal ? 'BULB2:ON' : 'BULB2:OFF';
                }
            } else if (device.path.includes('fans')) {
                newVal = device.value === 0 ? (device.memoryValue || 50) : 0;
                statusLabel = newVal > 0 ? 'Turned ON' : 'Turned OFF';
                
                if (device.id === 'fan1_speed') {
                    action = `FAN1:${newVal}`;
                } else if (device.id === 'fan2_speed') {
                    action = `FAN2:${newVal}`;
                }
            }

            if (!action) {
                triggerToast("Unknown device");
                return;
            }

            // Send command to ESP32 (instant execution)
            const response = await espCommandService.sendCommand(action);
            
            if (response.success) {
                addHistoryItem(`${device.name} ${statusLabel}`, "Manual Control", 'flash-outline');
                triggerToast(`${device.name} ${statusLabel.toLowerCase()}`);
                
                // Update local device state from response
                setDevices(prevDevices => 
                    prevDevices.map(d => {
                        if (d.id === device.id) {
                            return {
                                ...d,
                                value: newVal,
                                details: d.path === 'servo/angle' 
                                    ? (newVal > 0 ? `Open (${newVal}°)` : 'Closed')
                                    : (newVal ? 'Active' : 'Inactive')
                            };
                        }
                        return d;
                    })
                );
            } else {
                triggerToast("Command failed: " + response.message);
            }
        } catch (error) {
            triggerToast("Error: " + (error instanceof Error ? error.message : 'Unknown error'));
            console.error('Toggle error:', error);
        } finally {
            setLoadingDevice(null);
        }
    };

    /**
     * Handle voice command execution
     */
    const handleVoiceCommand = async (command: VoiceCommand) => {
        try {
            setLoadingDevice('voice');
            
            // Send command to ESP32
            const response = await espCommandService.sendCommand(command.action);
            
            if (response.success) {
                // Speak confirmation
                const confirmMsg = voiceControl.voiceState.language === 'ur' 
                    ? 'ٹھیک ہے، یہ کر رہے ہیں'
                    : 'Okay, doing this';
                    
                await voiceControl.speakConfirmation(confirmMsg);
                
                // Log to history
                addHistoryItem(
                    command.name, 
                    'Voice Control', 
                    'mic'
                );
                
                triggerToast(`${command.name}`);
                
                // Update device states from response
                setDevices(prevDevices =>
                    prevDevices.map(d => {
                        const updated = { ...d };
                        
                        if (response.device_states) {
                            if (d.id === 'bulb1') updated.value = response.device_states.bulb1;
                            if (d.id === 'bulb2') updated.value = response.device_states.bulb2;
                            if (d.id === 'fan1_speed') updated.value = response.device_states.fan1_speed;
                            if (d.id === 'fan2_speed') updated.value = response.device_states.fan2_speed;
                            if (d.id === 'angle') updated.value = response.device_states.servo_angle;
                        }
                        return updated;
                    })
                );
            } else {
                const errorMsg = voiceControl.voiceState.language === 'ur'
                    ? 'کمان ناکام'
                    : 'Command failed';
                await voiceControl.speakConfirmation(errorMsg);
                triggerToast("Command failed: " + response.message);
            }
        } catch (error) {
            triggerToast("Voice execution error");
            console.error('Voice command error:', error);
        } finally {
            setLoadingDevice(null);
        }
    };

    /**
     * Initialize voice control on mount
     */
    useEffect(() => {
        voiceControl.initializeAudio();
    }, [voiceControl]);

    /**
     * Handle opening voice control modal with error checking
     */
    const handleOpenVoiceControl = async () => {
        if (voiceControl.voiceState.error && voiceControl.voiceState.error.includes('permission')) {
            Alert.alert(
                'Microphone Permission Required',
                'Please enable microphone permission in app settings to use voice control.',
                [{ text: 'OK' }]
            );
            return;
        }
        setVoiceModalVisible(true);
    };

    const onlineCount = devices.filter(d => d.status === 'online').length;
    const connectionIcon = espConnection.connectionType === 'bluetooth'
        ? 'bluetooth'
        : espConnection.isConnected
            ? 'wifi'
            : 'wifi-outline';
    const connectionLabel = espConnection.isConnected
        ? espConnection.connectionType === 'bluetooth'
            ? 'Bluetooth'
            : 'WiFi'
        : espConnection.isConnecting
            ? 'Connecting...'
            : 'Offline';

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BLUE_PRIMARY} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={BLUE_PRIMARY} translucent={true} />
            
            <View style={styles.headerContainer}>
                <PageHeader 
                    icon={<Ionicons name="home" size={sIcon(30)} color="#fff" />}
                    title="VISTA" 
                    subtitle="Smart Home Dashboard" 
                />
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={() => setConnectionModalVisible(true)}
                    >
                        <Ionicons 
                            name={connectionIcon} 
                            size={sIcon(24)} 
                            color="#fff" 
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={handleOpenVoiceControl}
                    >
                        <Ionicons name="mic" size={sIcon(24)} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentWrapper}>
                    <LinearGradient colors={['#59bfcaff', '#008080']} style={styles.statsCardWrapper}>
                        <View style={styles.statsCardInner}>
                            <View style={styles.statsHeader}>
                                <Text style={[styles.statsTitle, { fontSize: sText(18) }]}>Device Status</Text>
                                <View style={[styles.connectionIndicator, { backgroundColor: espConnection.isConnected ? '#4CAF50' : '#FF6B35' }]}>
                                    <Ionicons 
                                        name={connectionIcon} 
                                        size={sIcon(14)} 
                                        color="#fff" 
                                    />
                                    <Text style={[styles.connectionText, { fontSize: sText(10) }]}>
                                        {connectionLabel}
                                    </Text>
                                </View>
                            </View>
                            {espConnection.isConnecting && (
                                <ActivityIndicator size="small" color={BLUE_PRIMARY} style={{ marginBottom: 10 }} />
                            )}
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Ionicons name="power" size={sIcon(24)} color={BLUE_PRIMARY} />
                                    <Text style={[styles.statLabel, { fontSize: sText(12) }]}>Active</Text>
                                    <Text style={[styles.statNumber, { fontSize: sText(20) }]}>{devices.length}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Ionicons name={connectionIcon} size={sIcon(24)} color={espConnection.isConnected ? "#4CAF50" : "#9E9E9E"} />
                                    <Text style={[styles.statLabel, { fontSize: sText(12) }]}>Status</Text>
                                    <Text style={[styles.statNumber, { fontSize: sText(16) }]}>
                                        {espConnection.isConnected ? connectionLabel : 'Wait...'}
                                    </Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Ionicons name="hardware-chip" size={sIcon(24)} color="#FF6B35" />
                                    <Text style={[styles.statLabel, { fontSize: sText(12) }]}>System</Text>
                                    <Text style={[styles.statNumber, { fontSize: sText(16) }]}>v2.0</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>

                    <View style={styles.devicesSection}>
                        <Text style={[styles.sectionTitle, { fontSize: sText(20) }]}>Connected Devices</Text>
                        {devices.map((device) => (
                            <DeviceCard 
                                key={device.id} 
                                device={device}
                                gradientStart="#59bfcaff" 
                                gradientEnd="#008080"
                                cardBackground="#FFFFFF"
                                iconName={
                                    device.type === 'bulb' || device.type === 'tube-light' ? 'bulb-outline' : 
                                    device.type === 'fan' ? 'snow-outline' : 
                                    device.type === 'main gate' ? 'key-outline' : 'help-outline'
                                }
                                iconColor="#fff" 
                                iconBgColor={BLUE_PRIMARY}
                                toggleOnColor={BLUE_PRIMARY} 
                                toggleOffColor="#CCCCCC"
                                onToggle={() => handleToggle(device)}
                                isLoading={loadingDevice === device.id}
                                isDisabled={!espConnection.isConnected}
                            >
                                {device.type === 'fan' && device.value > 0 && (
                                    <View style={styles.speedRow}>
                                        <TouchableOpacity 
                                            onPress={() => updateSpeed(device, false)}
                                            disabled={device.value <= 30}
                                            style={{ opacity: device.value <= 30 ? 0.3 : 1 }}
                                        >
                                            <Ionicons name="remove-circle-outline" size={sIcon(28)} color={BLUE_PRIMARY} />
                                        </TouchableOpacity>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={[styles.speedLabel, { fontSize: sText(10) }]}>SPEED CONTROL</Text>
                                            <Text style={[styles.speedValue, { fontSize: sText(18) }]}>{device.value}%</Text>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => updateSpeed(device, true)}
                                            disabled={device.value >= 100}
                                            style={{ opacity: device.value >= 100 ? 0.3 : 1 }}
                                        >
                                            <Ionicons name="add-circle-outline" size={sIcon(28)} color={BLUE_PRIMARY} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </DeviceCard>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {toastMsg !== '' && (
                <Animated.View style={[styles.toastWrapper, { opacity: fadeAnim }]}>
                    <View style={styles.toastInner}>
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        <Text style={styles.toastText}>{toastMsg}</Text>
                    </View>
                </Animated.View>
            )}

            {/* Voice Control Modal */}
            <VoiceControlModal
                visible={voiceModalVisible}
                voiceState={voiceControl.voiceState}
                onClose={() => {
                    voiceControl.cancelRecording();
                    setVoiceModalVisible(false);
                    voiceControl.resetState();
                }}
                onLanguageChange={voiceControl.setLanguage}
                onStartRecording={voiceControl.startRecording}
                onStopRecording={voiceControl.stopRecording}
                onCancelRecording={voiceControl.cancelRecording}
                onResetState={voiceControl.resetState}
                onConfirmCommand={handleVoiceCommand}
                onShowCommands={() => setVoiceCommandsListVisible(true)}
                availableCommands={voiceControl.getAvailableCommands()}
            />

            {/* Voice Commands List Modal */}
            <VoiceCommandsList
                visible={voiceCommandsListVisible}
                commands={voiceControl.getAvailableCommands()}
                language={voiceControl.voiceState.language}
                onClose={() => setVoiceCommandsListVisible(false)}
            />

            {/* Connection Modal */}
            <ConnectionModal
                visible={connectionModalVisible}
                onClose={() => setConnectionModalVisible(false)}
                isBluetoothConnected={espConnection.connectionType === 'bluetooth' && espConnection.isConnected}
                connectionType={espConnection.connectionType}
                connectedDeviceName={null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 20,
        paddingVertical: 55,
        gap: 12,
    },
    headerButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    contentContainer: { alignItems: 'center', paddingBottom: 100, paddingHorizontal: 20 },
    contentWrapper: { width: '100%', maxWidth: 400 },
    
    // Bottom Toast Styles
    toastWrapper: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        zIndex: 2000,
        alignItems: 'center',
    },
    toastInner: {
        backgroundColor: BLUE_PRIMARY,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 35,
        width: '100%',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    toastText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '700', 
        marginLeft: 12 
    },

    statsCardWrapper: { borderRadius: 20, padding: 1.5, marginVertical: 20, elevation: 4 },
    statsCardInner: { backgroundColor: '#fff', borderRadius: 18.5, padding: 20 },
    statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    statsTitle: { fontWeight: '700', textAlign: 'left', flex: 1 },
    connectionIndicator: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20,
        gap: 6
    },
    connectionText: { color: '#fff', fontWeight: '600' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { alignItems: 'center', backgroundColor: '#e6f0fa', borderRadius: 12, flex: 1, marginHorizontal: 4, padding: 12 },
    statLabel: { color: '#666', marginTop: 6 },
    statNumber: { fontWeight: 'bold', marginTop: 4 },
    devicesSection: { width: '100%' },
    sectionTitle: { fontWeight: 'bold', marginBottom: 15 },
    speedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginTop: 10 },
    speedLabel: { color: '#888', fontWeight: 'bold' },
    speedValue: { fontWeight: 'bold', color: BLUE_PRIMARY }
});

export default Dashboard;
