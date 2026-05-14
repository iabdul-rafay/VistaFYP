import { useSettings } from '@/context/settingsContext';
import useEspConnection from '@/hooks/useEspConnection';
import { useScale } from '@/hooks/useScale';
import useVoiceControl from '@/hooks/useVoiceControl';
import espCommandService from '@/services/espCommandService';
import { VoiceCommand } from '@/services/voiceCommandService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { FC, useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PageHeader from '../../components/PageHeader';

// --- TYPE DEFINITIONS ---
interface Command {
  title: string;
  example: string;
}

interface IconProps { 
  size?: number;
  color?: string;
}

// 🎨 --- COLORS ---
const BLUE_PRIMARY = '#008080';
const BUTTON_GRADIENT_START = '#00C4CC';
const BUTTON_GRADIENT_END = '#008080';
const BORDER_GRADIENT_START = '#59bfcaff';
const BORDER_GRADIENT_END = '#008080';
const CARD_INNER_BACKGROUND = '#FFFFFF';

const MicrophoneIcon: FC<IconProps> = ({ size = 50, color = BLUE_PRIMARY }) => (
  <Ionicons name="mic" size={size} color={color} />
);

const VoiceMode: FC = () => {
  const { sText, sIcon, isLarge } = useScale();
  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  const voiceControl = useVoiceControl(openaiApiKey);
  const espConnection = useEspConnection(true);
  const { addHistoryItem } = useSettings();
  
  const [toastMsg, setToastMsg] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const COMMAND_EXAMPLES: Command[] = [
      { title: "Turn on/off devices", example: '"Turn on the bulb"' },
      { title: "Control Fan", example: '"Turn on fan 1"' },
      { title: "Open/close gate", example: '"Open the gate"' },
      { title: "Switch languages", example: '"Use اردو"' },
  ];

  // Initialize voice control on mount
  useEffect(() => {
    voiceControl.initializeAudio();
  }, [voiceControl]);

  const triggerToast = (message: string) => {
    setToastMsg(message);
    Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start(() => setToastMsg(''));
  };

  const handleStartRecording = async () => {
    if (!espConnection.isConnected) {
      Alert.alert(
        'Device Not Connected',
        'Please connect to your ESP32 device first from the Home tab.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (voiceControl.voiceState.error && voiceControl.voiceState.error.includes('permission')) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone permission in app settings to use voice control.',
        [{ text: 'OK' }]
      );
      return;
    }

    await voiceControl.startRecording();
  };

  const handleStopRecording = async () => {
    await voiceControl.stopRecording();
  };

  const handleConfirmCommand = async (command: VoiceCommand) => {
    try {
      // Send command to ESP32
      const response = await espCommandService.sendCommand(command.action);
      
      if (response.success) {
        // Speak confirmation
        const confirmMsg = voiceControl.voiceState.language === 'ur' 
          ? 'ٹھیک ہے، یہ کر رہے ہیں'
          : 'Okay, executing command';
          
        await voiceControl.speakConfirmation(confirmMsg);
        
        // Log to history
        addHistoryItem(command.name, 'Voice Control', 'mic');
        triggerToast(`✓ ${command.name}`);
      } else {
        const errorMsg = voiceControl.voiceState.language === 'ur'
          ? 'کمان ناکام'
          : 'Command failed';
        await voiceControl.speakConfirmation(errorMsg);
        triggerToast('✗ Command failed');
      }
    } catch (error) {
      triggerToast('✗ Error executing command');
      console.error('Voice command error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        icon={<MicrophoneIcon size={sIcon(30)} color="#fff" />}
        title="Voice Control"
        subtitle="Speak your commands naturally"
      />
      
      <ScrollView contentContainerStyle={styles.contentContainer} style={styles.contentScroll}>

        {/* Status Card */}
        <LinearGradient
            colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusCard} 
        >
            <View style={styles.statusInner}>
                <View style={styles.statusHeader}>
                  <View style={[
                    styles.statusIndicator,
                    { 
                      backgroundColor: espConnection.isConnected ? '#4CAF50' : '#FF6B35',
                      width: sIcon(16),
                      height: sIcon(16),
                      borderRadius: sIcon(8),
                    }
                  ]} />
                  <Text style={[styles.statusText, { fontSize: sText(14) }]}>
                    {espConnection.isConnected ? 'Connected & Ready' : 'Waiting for connection'}
                  </Text>
                </View>
                <Text style={[styles.languageText, { fontSize: sText(12) }]}>
                  Language: {voiceControl.voiceState.language === 'ur' ? 'اردو' : 'English'}
                </Text>
            </View>
        </LinearGradient>

        {/* Main Microphone Card */}
        <LinearGradient
            colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.micCardGradientWrapper} 
        >
            <View style={styles.micCardInner}>
                <View style={[
                  styles.micCircle, 
                  { 
                    width: sIcon(120), 
                    height: sIcon(120), 
                    borderRadius: sIcon(60),
                    backgroundColor: voiceControl.voiceState.isRecording ? '#FFE6E6' : '#e6f0fa',
                  }
                ]}>
                    <MicrophoneIcon size={sIcon(60)} color={voiceControl.voiceState.isRecording ? '#FF6B35' : BLUE_PRIMARY} /> 
                </View>
                
                <View style={styles.textContainer}>
                  {voiceControl.voiceState.isRecording ? (
                    <>
                      <Text style={[styles.listeningText, { fontSize: sText(20) }]}>
                        🎤 Listening...
                      </Text>
                      <Text style={[styles.timerText, { fontSize: sText(18) }]}>
                        {voiceControl.voiceState.recordingTime}s
                      </Text>
                    </>
                  ) : voiceControl.voiceState.isProcessing ? (
                    <>
                      <Text style={[styles.processingText, { fontSize: sText(16) }]}>
                        Processing...
                      </Text>
                    </>
                  ) : voiceControl.voiceState.matchedCommand ? (
                    <>
                      <Text style={[styles.successText, { fontSize: sText(16) }]}>
                        ✓ Command Matched
                      </Text>
                      <Text style={[styles.commandNameText, { fontSize: sText(14) }]}>
                        {voiceControl.voiceState.matchedCommand.name}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.instruction, { fontSize: sText(18) }]}>Tap to speak</Text>
                      <Text style={[styles.note, { fontSize: sText(14) }]}>Hold and speak your command</Text>
                    </>
                  )}
                </View>
            </View>
        </LinearGradient>

        {/* Recording Button */}
        {!voiceControl.voiceState.isProcessing && (
          <TouchableOpacity 
            style={styles.recordButton}
            onPress={voiceControl.voiceState.isRecording ? handleStopRecording : handleStartRecording} 
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={voiceControl.voiceState.isRecording ? ['#FF6B35', '#FF8C42'] : [BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]} 
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.recordButtonGradient as ViewStyle]}
            >
              <Ionicons 
                name={voiceControl.voiceState.isRecording ? 'stop-circle' : 'mic'} 
                size={sIcon(24)} 
                color="#fff" 
              />
              <Text style={[styles.recordButtonText, { fontSize: sText(16) }]}>
                {voiceControl.voiceState.isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Transcription Display */}
        {voiceControl.voiceState.transcript && (
          <View style={styles.transcriptionBox}>
            <Text style={[styles.transcriptionLabel, { fontSize: sText(12) }]}>
              You said:
            </Text>
            <Text style={[styles.transcriptionText, { fontSize: sText(14) }]}>
              "{voiceControl.voiceState.transcript}"
            </Text>
          </View>
        )}

        {/* Matched Command Display */}
        {voiceControl.voiceState.matchedCommand && (
          <View style={styles.commandBox}>
            <View style={styles.commandBoxHeader}>
              <Ionicons name="checkmark-circle" size={sIcon(24)} color="#4CAF50" />
              <Text style={[styles.matchedCommandText, { fontSize: sText(14) }]}>
                Matched Command
              </Text>
            </View>
            <Text style={[styles.matchedCommandName, { fontSize: sText(16) }]}>
              {voiceControl.voiceState.matchedCommand.name}
            </Text>
            {voiceControl.voiceState.matchedCommand.action && (
              <Text style={[styles.actionText, { fontSize: sText(11) }]}>
                Action: {voiceControl.voiceState.matchedCommand.action}
              </Text>
            )}
            
            <View style={styles.commandButtonsRow}>
              <TouchableOpacity
                style={[styles.commandButton, styles.cancelButton]}
                onPress={voiceControl.resetState}
              >
                <Ionicons name="close-circle" size={sIcon(20)} color="#fff" />
                <Text style={[styles.commandButtonText, { fontSize: sText(12) }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.commandButton, styles.executeButton]}
                onPress={() => handleConfirmCommand(voiceControl.voiceState.matchedCommand!)}
              >
                <Ionicons name="checkmark-circle" size={sIcon(20)} color="#fff" />
                <Text style={[styles.commandButtonText, { fontSize: sText(12) }]}>Execute</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error Display */}
        {voiceControl.voiceState.error && !voiceControl.voiceState.matchedCommand && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={sIcon(20)} color="#FF6B35" />
            <Text style={[styles.errorText, { fontSize: sText(12) }]}>
              {voiceControl.voiceState.error}
            </Text>
          </View>
        )}

        {/* Language Toggle */}
        <View style={styles.languageToggle}>
          <TouchableOpacity 
            style={[
              styles.langButton,
              voiceControl.voiceState.language === 'en' && styles.langButtonActive
            ]}
            onPress={() => voiceControl.setLanguage('en')}
          >
            <Text style={[
              styles.langButtonText,
              { fontSize: sText(12) },
              voiceControl.voiceState.language === 'en' && styles.langButtonTextActive
            ]}>
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.langButton,
              voiceControl.voiceState.language === 'ur' && styles.langButtonActive
            ]}
            onPress={() => voiceControl.setLanguage('ur')}
          >
            <Text style={[
              styles.langButtonText,
              { fontSize: sText(12) },
              voiceControl.voiceState.language === 'ur' && styles.langButtonTextActive
            ]}>
              اردو
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.commandPrompt, { fontSize: sText(14) }]}>Available Commands</Text>
        
        {/* Command List */}
        <View style={styles.commandList}>
            {voiceControl.getAvailableCommands().slice(0, 6).map((cmd: VoiceCommand, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.7} 
                  style={styles.commandItemOuterWrapper}
                  onPress={() => handleConfirmCommand(cmd)}
                >
                    <LinearGradient
                        colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.commandItemGradientBorder}
                    >
                        <View style={styles.commandItemInnerContent}> 
                            <Ionicons name="radio-button-off" size={sIcon(16)} color={BLUE_PRIMARY} />
                            <View style={styles.commandTextWrapper}>
                                <Text style={[styles.commandTitle, { fontSize: sText(13) }]}>{cmd.name}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={sIcon(16)} color={BLUE_PRIMARY} />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            ))}
        </View>

      </ScrollView>

      {/* Toast */}
      {toastMsg !== '' && (
        <Animated.View style={[styles.toastWrapper, { opacity: fadeAnim }]}>
          <View style={styles.toastInner}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    contentScroll: { flex: 1, paddingHorizontal: 16 },
    contentContainer: { alignItems: 'center', paddingBottom: 40, paddingTop: 10 },
    
    // Status Card
    statusCard: {
      borderRadius: 16, width: '100%', maxWidth: 400, padding: 1.5,
      marginBottom: 16, elevation: 3,
    },
    statusInner: {
      backgroundColor: CARD_INNER_BACKGROUND, borderRadius: 15, 
      paddingVertical: 12, paddingHorizontal: 16, width: '100%',
    },
    statusHeader: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 6,
    },
    statusIndicator: {
      marginRight: 10,
    },
    statusText: {
      fontWeight: '600', color: '#333',
    },
    languageText: {
      color: '#666', marginLeft: 26,
    },

    // Microphone Card
    micCardGradientWrapper: {
        borderRadius: 20, width: '100%', maxWidth: 400, padding: 1.5,
        marginBottom: 20, elevation: 4, 
    },
    micCardInner: {
        backgroundColor: CARD_INNER_BACKGROUND, borderRadius: 18.5, 
        paddingVertical: 30, paddingHorizontal: 15, width: '100%', alignItems: 'center',
    },
    micCircle: {
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    textContainer: { alignItems: 'center' },
    instruction: { fontWeight: '600', textAlign: 'center', marginBottom: 5, color: '#333' },
    note: { color: '#666', textAlign: 'center' },
    listeningText: { fontWeight: 'bold', textAlign: 'center', color: '#FF6B35' },
    timerText: { fontWeight: 'bold', textAlign: 'center', marginTop: 8, color: '#FF6B35' },
    processingText: { fontWeight: '600', textAlign: 'center', color: '#00C4CC' },
    successText: { fontWeight: 'bold', textAlign: 'center', color: '#4CAF50' },
    commandNameText: { fontWeight: '600', textAlign: 'center', marginTop: 4, color: '#333' },

    // Record Button
    recordButton: { width: '100%', maxWidth: 400, borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
    recordButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
    recordButtonText: { color: '#fff', fontWeight: '600', marginLeft: 10 },

    // Transcription
    transcriptionBox: {
      width: '100%', maxWidth: 400, backgroundColor: 'rgba(0, 128, 128, 0.1)', borderRadius: 12,
      padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: BLUE_PRIMARY,
    },
    transcriptionLabel: {
      color: '#666', fontWeight: '500', marginBottom: 6,
    },
    transcriptionText: {
      color: '#333', fontWeight: '500', fontStyle: 'italic',
    },

    // Command Box
    commandBox: {
      width: '100%', maxWidth: 400, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 12,
      padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#4CAF50',
    },
    commandBoxHeader: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    },
    matchedCommandText: {
      color: '#666', fontWeight: '500', marginLeft: 8,
    },
    matchedCommandName: {
      color: '#333', fontWeight: '700', marginBottom: 6,
    },
    actionText: {
      color: '#999', marginBottom: 12,
    },
    commandButtonsRow: {
      flexDirection: 'row', gap: 10,
    },
    commandButton: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, borderRadius: 10, gap: 6,
    },
    cancelButton: {
      backgroundColor: '#FF6B35',
    },
    executeButton: {
      backgroundColor: '#4CAF50',
    },
    commandButtonText: {
      color: '#fff', fontWeight: '600',
    },

    // Error Box
    errorBox: {
      width: '100%', maxWidth: 400, backgroundColor: 'rgba(255, 107, 53, 0.1)', borderRadius: 12,
      padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
      borderLeftWidth: 4, borderLeftColor: '#FF6B35',
    },
    errorText: {
      color: '#FF6B35', flex: 1, marginLeft: 10, fontWeight: '500',
    },

    // Language Toggle
    languageToggle: {
      flexDirection: 'row', gap: 10, width: '100%', maxWidth: 400, marginBottom: 16,
    },
    langButton: {
      flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 128, 128, 0.1)',
      borderWidth: 2, borderColor: 'transparent',
    },
    langButtonActive: {
      backgroundColor: BLUE_PRIMARY, borderColor: BLUE_PRIMARY,
    },
    langButtonText: {
      textAlign: 'center', fontWeight: '600', color: BLUE_PRIMARY,
    },
    langButtonTextActive: {
      color: '#fff',
    },

    // Command Prompt
    commandPrompt: { color: '#333', textAlign: 'left', width: '100%', maxWidth: 400, marginBottom: 12, fontWeight: 'bold' },
    
    // Command List
    commandList: { width: '100%', maxWidth: 400 },
    commandItemOuterWrapper: { borderRadius: 12, marginBottom: 10, overflow: 'hidden', elevation: 2 },
    commandItemGradientBorder: { padding: 1, borderRadius: 12 },
    commandItemInnerContent: { 
        backgroundColor: CARD_INNER_BACKGROUND, flexDirection: 'row', 
        alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 11, 
    },
    commandTextWrapper: { flex: 1, marginLeft: 10 },
    commandTitle: { fontWeight: '600', color: '#333' },
    commandExample: { color: '#666', marginTop: 2 },

    // Toast
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
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
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
      fontSize: 14, 
      fontWeight: '700', 
      textAlign: 'center',
    },
});

export default VoiceMode;