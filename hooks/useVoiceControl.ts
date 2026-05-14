/**
 * useVoiceControl Hook
 * 
 * Manages voice recording, transcription, and command execution
 * - Record audio using expo-av
 * - Transcribe using Whisper API
 * - Match commands and execute
 * - Voice feedback
 */

import voiceCommandService, { Language, VoiceCommand } from '@/services/voiceCommandService';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useRef, useState } from 'react';

export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  isListening: boolean;
  error: string | null;
  transcript: string;
  matchedCommand: VoiceCommand | null;
  language: Language;
  recordingTime: number; // in seconds
}

export const useVoiceControl = (openaiApiKey: string) => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isRecording: false,
    isProcessing: false,
    isListening: false,
    error: null,
    transcript: '',
    matchedCommand: null,
    language: 'en',
    recordingTime: 0,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxRecordingTime = 30000; // 30 seconds max

  /**
   * Initialize audio permissions and settings
   */
  const initializeAudio = useCallback(async () => {
    try {
      console.log('[VoiceControl] Starting audio initialization...');
      
      const permission = await Audio.requestPermissionsAsync();
      console.log('[VoiceControl] Permission status:', permission.granted);
      
      if (!permission.granted) {
        const errorMsg = 'Microphone permission is required. Please enable it in app settings to use voice control.';
        console.error('[VoiceControl] Permission denied:', errorMsg);
        setVoiceState((prev) => ({
          ...prev,
          error: errorMsg,
        }));
        return false;
      }
      
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
      });
      
      console.log('[VoiceControl] Audio initialized successfully');
      setVoiceState((prev) => ({
        ...prev,
        error: null,
      }));
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize audio';
      console.error('[VoiceControl] Audio initialization failed:', error);
      setVoiceState((prev) => ({
        ...prev,
        error: errorMsg,
      }));
      return false;
    }
  }, []);

  /**
   * Start recording voice
   */
  const startRecording = useCallback(async () => {
    try {
      console.log('[VoiceControl] Start recording called. API Key:', openaiApiKey && openaiApiKey !== 'sk-your-openai-api-key-here' ? 'Present' : 'Using Mock');
      
      // Allow recording even without API key (will use mock transcription)

      // Ensure audio is properly initialized and permissions are granted
      console.log('[VoiceControl] Initializing audio...');
      const audioReady = await initializeAudio();
      if (!audioReady) {
        throw new Error('Audio initialization failed. Microphone permission may be required.');
      }

      console.log('[VoiceControl] Setting audio mode for recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
      });

      setVoiceState((prev) => ({
        ...prev,
        isRecording: true,
        isListening: true,
        error: null,
        recordingTime: 0,
      }));

      // Initialize recording
      console.log('[VoiceControl] Creating new recording instance...');
      const recording = new Audio.Recording();
      recordingRef.current = recording;

      console.log('[VoiceControl] Preparing to record with HIGH_QUALITY preset...');
      const status = await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      console.log('[VoiceControl] Record status:', { canRecord: status.canRecord, isDone: status.isDone });

      if (status.canRecord) {
        console.log('[VoiceControl] Starting audio recording...');
        await recording.startAsync();
        console.log('[VoiceControl] Recording started successfully');

        // Start recording timer
        let time = 0;
        recordingTimerRef.current = setInterval(() => {
          time += 100;
          setVoiceState((prev) => ({
            ...prev,
            recordingTime: Math.floor(time / 1000),
          }));

          // Auto-stop after 30 seconds
          if (time >= maxRecordingTime) {
            console.log('[VoiceControl] Auto-stopping recording at 30 seconds');
            stopRecording();
          }
        }, 100);
      } else {
        throw new Error('Recording device not ready. Cannot start recording.');
      }
    } catch (error) {
      console.error('[VoiceControl] Recording failed:', error);
      setVoiceState((prev) => ({
        ...prev,
        isRecording: false,
        isListening: false,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
    }
  }, [openaiApiKey, initializeAudio]);

  /**
   * Stop recording and process audio
   */
  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        throw new Error('No active recording');
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      console.log('[VoiceControl] Recording stopped, processing...');

      setVoiceState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: true,
      }));

      // Initialize Whisper service with API key
      voiceCommandService.setApiKey(openaiApiKey);
      voiceCommandService.setLanguage(voiceState.language);

      // Transcribe audio
      const transcript = await voiceCommandService.transcribeAudio(uri);

      // Match command
      const matchedCommand = voiceCommandService.matchCommand(transcript);

      setVoiceState((prev) => ({
        ...prev,
        isProcessing: false,
        isListening: false,
        transcript,
        matchedCommand,
        error: matchedCommand ? null : 'Command not recognized',
      }));

      // Clean up audio file
      try {
        await FileSystem.deleteAsync(uri);
      } catch (e) {
        console.warn('[VoiceControl] Failed to delete recording file');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      return { transcript, matchedCommand };
    } catch (error) {
      console.error('[VoiceControl] Processing failed:', error);
      setVoiceState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        isListening: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      }));
      return null;
    }
  }, [voiceState.language, openaiApiKey]);

  /**
   * Cancel recording
   */
  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (uri) {
          await FileSystem.deleteAsync(uri);
        }
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      setVoiceState((prev) => ({
        ...prev,
        isRecording: false,
        isListening: false,
        isProcessing: false,
        recordingTime: 0,
      }));

      console.log('[VoiceControl] Recording cancelled');
    } catch (error) {
      console.error('[VoiceControl] Cancellation failed:', error);
    }
  }, []);

  /**
   * Set language for voice recognition
   */
  const setLanguage = useCallback((language: Language) => {
    voiceCommandService.setLanguage(language);
    setVoiceState((prev) => ({
      ...prev,
      language,
    }));
    console.log('[VoiceControl] Language set to:', language);
  }, []);

  /**
   * Speak confirmation message
   */
  const speakConfirmation = useCallback(async (message: string) => {
    try {
      await voiceCommandService.speak(message);
    } catch (error) {
      console.error('[VoiceControl] TTS error:', error);
    }
  }, []);

  /**
   * Get all available commands for current language
   */
  const getAvailableCommands = useCallback(() => {
    return voiceCommandService.getAvailableCommands();
  }, []);

  /**
   * Reset voice state
   */
  const resetState = useCallback(() => {
    setVoiceState((prev) => ({
      ...prev,
      transcript: '',
      matchedCommand: null,
      error: null,
      recordingTime: 0,
    }));
  }, []);

  return {
    voiceState,
    initializeAudio,
    startRecording,
    stopRecording,
    cancelRecording,
    setLanguage,
    speakConfirmation,
    getAvailableCommands,
    resetState,
  };
};

export default useVoiceControl;
