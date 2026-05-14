/**
 * Voice Control Modal Component
 * 
 * UI for voice recording, transcription display, and command confirmation
 */

import { useScale } from '@/hooks/useScale';
import type { VoiceState } from '@/hooks/useVoiceControl';
import type { VoiceCommand } from '@/services/voiceCommandService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface VoiceControlModalProps {
  visible: boolean;
  voiceState: VoiceState;
  onClose: () => void;
  onLanguageChange: (language: 'en' | 'ur') => void;
  onStartRecording: () => void;
  onStopRecording: () => Promise<any>;
  onCancelRecording: () => void;
  onResetState: () => void;
  onConfirmCommand: (command: VoiceCommand) => void;
  onShowCommands: () => void;
  availableCommands: VoiceCommand[];
}

const BLUE_PRIMARY = '#008080';
const BUTTON_GRADIENT_START = '#00C4CC';
const BUTTON_GRADIENT_END = '#008080';

export const VoiceControlModal: React.FC<VoiceControlModalProps> = ({
  visible,
  voiceState,
  onClose,
  onLanguageChange,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onResetState,
  onConfirmCommand,
  onShowCommands,
}) => {
  const { sText, sIcon } = useScale();
  const [confirmingCommand, setConfirmingCommand] = useState(false);

  useEffect(() => {
    if (!visible) {
      setConfirmingCommand(false);
    }
  }, [visible]);

  const handleConfirmCommand = async () => {
    if (!voiceState.matchedCommand) return;

    setConfirmingCommand(true);
    onConfirmCommand(voiceState.matchedCommand);

    // Auto-close after 2 seconds
    setTimeout(() => {
      onClose();
      setConfirmingCommand(false);
    }, 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: sText(24) }]}>Voice Command</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={sIcon(28)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Language Selection */}
          <View style={styles.languageSelector}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                voiceState.language === 'en' && styles.languageButtonActive,
              ]}
              onPress={() => onLanguageChange('en')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  { fontSize: sText(14) },
                  voiceState.language === 'en' && styles.languageButtonTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageButton,
                voiceState.language === 'ur' && styles.languageButtonActive,
              ]}
              onPress={() => onLanguageChange('ur')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  { fontSize: sText(14) },
                  voiceState.language === 'ur' && styles.languageButtonTextActive,
                ]}
              >
                اردو
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recording State */}
          <View style={styles.recordingSection}>
            {voiceState.isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={[styles.recordingText, { fontSize: sText(16) }]}>
                  Listening... {voiceState.recordingTime}s
                </Text>
              </View>
            ) : voiceState.isProcessing ? (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.processingText, { fontSize: sText(14) }]}>
                  Processing voice...
                </Text>
              </View>
            ) : null}
          </View>

          {/* Transcription Display */}
          {voiceState.transcript && (
            <View style={styles.transcriptionBox}>
              <Text style={[styles.transcriptionLabel, { fontSize: sText(12) }]}>
                Heard:
              </Text>
              <Text
                style={[styles.transcriptionText, { fontSize: sText(16) }]}
                numberOfLines={3}
              >
                "{voiceState.transcript}"
              </Text>
            </View>
          )}

          {/* Matched Command Display */}
          {voiceState.matchedCommand && (
            <View style={styles.commandBox}>
              <View style={styles.commandHeader}>
                <Ionicons
                  name="checkmark-circle"
                  size={sIcon(24)}
                  color="#4CAF50"
                />
                <Text
                  style={[styles.commandText, { fontSize: sText(16) }]}
                  numberOfLines={2}
                >
                  {voiceState.matchedCommand.name}
                </Text>
              </View>
              {voiceState.matchedCommand.action && (
                <Text style={[styles.actionText, { fontSize: sText(12) }]}>
                  Command: {voiceState.matchedCommand.action}
                </Text>
              )}
            </View>
          )}

          {/* Error Display */}
          {voiceState.error && !voiceState.matchedCommand && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={sIcon(24)} color="#FF6B35" />
              <Text style={[styles.errorText, { fontSize: sText(14) }]}>
                {voiceState.error}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {!voiceState.isRecording && !voiceState.isProcessing ? (
              <>
                {voiceState.matchedCommand && !confirmingCommand ? (
                  <>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonCancel]}
                      onPress={onResetState}
                    >
                      <Ionicons name="close" size={sIcon(20)} color="#fff" />
                      <Text style={[styles.buttonText, { fontSize: sText(14) }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.buttonConfirm]}
                      onPress={handleConfirmCommand}
                    >
                      <Ionicons name="checkmark" size={sIcon(20)} color="#fff" />
                      <Text style={[styles.buttonText, { fontSize: sText(14) }]}>
                        Execute
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={onShowCommands}
                    >
                      <Ionicons name="list" size={sIcon(20)} color={BLUE_PRIMARY} />
                      <Text
                        style={[
                          styles.buttonTextSecondary,
                          { fontSize: sText(14) },
                        ]}
                      >
                        Commands
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.buttonPrimary]}
                      onPress={onStartRecording}
                    >
                      <Ionicons name="mic" size={sIcon(24)} color="#fff" />
                      <Text style={[styles.buttonText, { fontSize: sText(14) }]}>
                        Record
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {confirmingCommand && (
                  <View style={styles.confirmingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={[styles.confirmingText, { fontSize: sText(14) }]}>
                      Executing command...
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={voiceState.isRecording ? onStopRecording : onCancelRecording}
                disabled={voiceState.isProcessing}
              >
                <Ionicons name="stop-circle" size={sIcon(24)} color="#fff" />
                <Text style={[styles.buttonText, { fontSize: sText(14) }]}>
                  {voiceState.isProcessing ? 'Processing...' : 'Stop'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recording Time Warning */}
          {voiceState.isRecording && voiceState.recordingTime > 25 && (
            <Text style={[styles.warningText, { fontSize: sText(12) }]}>
              ⚠️ Recording will auto-stop in {30 - voiceState.recordingTime}s
            </Text>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
    color: '#fff',
  },
  languageSelector: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  languageButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#fff',
  },
  languageButtonTextActive: {
    color: '#008080',
  },
  recordingSection: {
    width: '100%',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  recordingIndicator: {
    alignItems: 'center',
  },
  recordingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    marginBottom: 10,
    opacity: 0.7,
  },
  recordingText: {
    color: '#fff',
    fontWeight: '600',
  },
  processingIndicator: {
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: '500',
  },
  transcriptionBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  transcriptionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 6,
  },
  transcriptionText: {
    color: '#fff',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  commandBox: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commandText: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  actionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  errorText: {
    color: '#fff',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 120,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
  },
  buttonConfirm: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: BLUE_PRIMARY,
    fontWeight: '600',
  },
  confirmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmingText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: '600',
  },
  warningText: {
    color: '#FFD700',
    marginTop: 12,
    fontWeight: '600',
  },
});

export default VoiceControlModal;
