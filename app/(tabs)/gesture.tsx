import { CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { FC, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import PageHeader from '../../components/PageHeader';

// Import the scale hook
import { useScale } from '@/hooks/useScale';
import { initHandTracking } from '@/utils/handTracking';

const GRADIENT_START = '#00C4CC';
const GRADIENT_MID = '#438c8cff';
const GRADIENT_END = '#008080';
const CARD_BG = '#FFFFFF';
const ICON_BOX_BG = 'rgba(0, 196, 204, 0.1)';

interface GestureItem {
    iconName: string;
    title: string;
    subtitle: string;
    action: string;
}

const GestureMode: FC = () => {
    const [isDetecting, setIsDetecting] = useState<boolean>(false);
    const [isInitializing, setIsInitializing] = useState<boolean>(false);
    const [detectedGesture, setDetectedGesture] = useState<string>('');
    const [detectedCount, setDetectedCount] = useState<number>(0);
    const cameraRef = useRef<CameraView>(null);

    // Initialize scaling hook
    const { sText, sIcon, isLarge } = useScale();

    // Initialize hand tracking on mount
    useEffect(() => {
        const initializeHandTracking = async () => {
            try {
                await initHandTracking();
                console.log('[Gesture] Hand tracking initialized');
            } catch (error) {
                console.error('[Gesture] Failed to initialize hand tracking:', error);
            }
        };

        if (isDetecting) {
            setIsInitializing(true);
            initializeHandTracking().finally(() => setIsInitializing(false));
        }
    }, [isDetecting]);

    // Updated list with gesture actions
    const GESTURE_LIST: GestureItem[] = [
        { iconName: 'swipe-up', title: 'Swipe Up', subtitle: 'Turn on all lights', action: 'TOGGLE_ON' },
        { iconName: 'swipe-down', title: 'Swipe Down', subtitle: 'Turn off all lights', action: 'TOGGLE_OFF' },
        { iconName: 'swipe-right', title: 'Swipe Right', subtitle: 'Increase fan speed', action: 'INCREASE' },
        { iconName: 'swipe-left', title: 'Swipe Left', subtitle: 'Decrease fan speed', action: 'DECREASE' },
        { iconName: 'autorenew', title: 'Fist', subtitle: 'Toggle on/off', action: 'TOGGLE_ON' },
        { iconName: 'sync', title: 'Open Hand', subtitle: 'Open the Door', action: 'TOGGLE_DOOR' },
    ];

    return (
        <View style={styles.container}>
            <PageHeader
                icon={<Ionicons name="hand-left" size={sIcon(30)} color="#fff" />}
                title="Gesture Mode"
                subtitle="Control your home with intuitive hand gestures"
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
            >

                {/* --- CAMERA FEED CARD --- */}
                <LinearGradient colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]} style={styles.cameraBorder}>
                    {isDetecting ? (
                        <CameraView
                            ref={cameraRef}
                            style={[styles.cameraBox, { height: isLarge ? 260 : 220 }]}
                            facing="front"
                        />
                    ) : (
                        <View style={[styles.cameraBox, { height: isLarge ? 260 : 220 }]}>
                            <Ionicons name="camera-outline" size={sIcon(45)} color={GRADIENT_START} />
                            <Text style={[styles.cameraText, { fontSize: sText(16) }]}>
                                {isInitializing ? 'Initializing...' : 'Camera view'}
                            </Text>
                        </View>
                    )}
                </LinearGradient>

                {/* --- START / STOP BUTTON --- */}
                <TouchableOpacity
                    onPress={() => setIsDetecting(!isDetecting)}
                    disabled={isInitializing}
                    style={styles.startButtonContainer}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={isDetecting ? ['#4CAF50', '#388E3C'] : [GRADIENT_START, GRADIENT_MID, GRADIENT_END]}
                        style={[styles.startButton, { padding: isLarge ? 20 : 16 }]}
                    >
                        {isInitializing && <ActivityIndicator color="#fff" size="small" />}
                        <Ionicons name="hand-left" size={sIcon(18)} color="#fff" />
                        <Text style={[styles.startButtonText, { fontSize: sText(16) }]}>
                            {isInitializing ? 'Initializing...' : isDetecting ? 'Stop Detection' : 'Start Gesture Control'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* --- TOP STATS CARD --- */}
                <View style={styles.statsWrapper}>
                    <LinearGradient colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]} style={styles.statCardGradient}>
                        <View style={styles.statCardInner}>
                            <Ionicons name="hand-left" size={sIcon(22)} color={GRADIENT_START} />
                            <Text style={[styles.statNumber, { fontSize: sText(22) }]}>{detectedCount}</Text>
                            <Text style={[styles.statLabel, { fontSize: sText(14) }]}>Detected</Text>
                        </View>
                    </LinearGradient>

                    <LinearGradient colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]} style={styles.statCardGradient}>
                        <View style={styles.statCardInner}>
                            <Ionicons name="flash" size={sIcon(22)} color={GRADIENT_START} />
                            <Text style={[styles.statNumber, { fontSize: sText(22) }]}>{detectedGesture || '-'}</Text>
                            <Text style={[styles.statLabel, { fontSize: sText(14) }]}>Last Gesture</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* --- GESTURE LIST HEADING --- */}
                <Text style={[styles.sectionTitle, { fontSize: sText(22) }]}>Available Gestures</Text>
                <Text style={[styles.sectionSubtitle, { fontSize: sText(16) }]}>
                    Supported hand gestures for device control
                </Text>

                {/* --- GESTURE LIST (Now includes 6 items) --- */}
                {GESTURE_LIST.map((gesture, index) => (
                    <LinearGradient key={index} colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]} style={styles.gestureCardBorder}>
                        <View style={styles.gestureCardInner}>
                            <View style={[styles.iconBox, { width: sIcon(58), height: sIcon(58), borderRadius: sIcon(12) }]}>
                                {/* name={... as any} prevents the TypeScript error */}
                                <MaterialIcons name={gesture.iconName as any} size={sIcon(32)} color={GRADIENT_START} />
                            </View>

                            <View style={styles.textBox}>
                                <Text style={[styles.gestureTitle, { fontSize: sText(16) }]}>{gesture.title}</Text>
                                <Text style={[styles.gestureSubtitle, { fontSize: sText(14) }]}>{gesture.subtitle}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                ))}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    scroll: { flex: 1 },
    scrollContentContainer: { paddingHorizontal: 20, paddingBottom: 60 },
    cameraBorder: { borderRadius: 20, padding: 2, marginTop: 20, elevation: 4 },
    cameraBox: { backgroundColor: CARD_BG, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    cameraText: { marginTop: 10, color: '#666' },
    startButtonContainer: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
    startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    startButtonText: { color: '#fff', fontWeight: '600', marginLeft: 10 },
    statsWrapper: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
    statCardGradient: { width: '48%', borderRadius: 16, padding: 2, elevation: 3 },
    statCardInner: { backgroundColor: CARD_BG, borderRadius: 14, padding: 18, alignItems: 'center' },
    statNumber: { fontWeight: 'bold', marginTop: 8, color: '#0c5c57ff' },
    statLabel: { color: '#666' },
    sectionTitle: { fontWeight: '700', marginTop: 30, color: '#0c5c57ff' },
    sectionSubtitle: { color: '#666', marginBottom: 15, marginTop: 5 },
    gestureCardBorder: { padding: 2, borderRadius: 16, marginBottom: 12, elevation: 2 },
    gestureCardInner: { backgroundColor: CARD_BG, borderRadius: 14, flexDirection: 'row', alignItems: 'center', padding: 15 },
    iconBox: { backgroundColor: ICON_BOX_BG, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
    textBox: { flex: 1 },
    gestureTitle: { fontWeight: '600', color: '#0c5c57ff' },
    gestureSubtitle: { color: '#666', marginTop: 3 },
});

export default GestureMode;