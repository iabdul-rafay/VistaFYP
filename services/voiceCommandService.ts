/**
 * Voice Command Service
 * 
 * Handles:
 * - Speech-to-text using OpenAI Whisper API
 * - Command matching and fuzzy matching
 * - Text-to-speech feedback
 * - Language selection (English/Urdu)
 */

import commandDataset from '@/data/voiceCommandsBilingual.json';
import * as Speech from 'expo-speech';

export type Language = 'en' | 'ur';

export interface VoiceCommand {
  name: string;
  aliases: string[]; // variations of the command name
  action: string; // command to send to ESP32
  icon?: string;
}

interface DatasetCommand {
  intent: string;
  action: string;
  icon?: string;
  names: Record<Language, string>;
  utterances: Record<Language, string[]>;
}

const DATASET: DatasetCommand[] = commandDataset as DatasetCommand[];

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[،۔؟!,.!?'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toVoiceCommand = (command: DatasetCommand, language: Language): VoiceCommand => ({
  name: command.names[language] || command.names.en,
  aliases: command.utterances[language] || command.utterances.en || [],
  action: command.action,
  icon: command.icon,
});

export const AVAILABLE_COMMANDS: VoiceCommand[] = DATASET.map((command) => toVoiceCommand(command, 'en'));
export const URDU_COMMANDS: VoiceCommand[] = DATASET.map((command) => toVoiceCommand(command, 'ur'));

class VoiceCommandService {
  private openaiApiKey: string = '';
  private currentLanguage: Language = 'en';

  constructor(openaiApiKey: string = '') {
    this.openaiApiKey = openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    if (!this.openaiApiKey || this.openaiApiKey === 'sk-your-openai-api-key-here' || this.openaiApiKey.length < 50) {
      console.log('[VoiceService] No valid OpenAI API key configured. Using mock transcription for testing.');
    } else {
      console.log('[VoiceService] OpenAI API key configured. Using real Whisper transcription.');
    }
  }

  /**
   * Set OpenAI API key
   */
  setApiKey(key: string) {
    this.openaiApiKey = key || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  }

  /**
   * Set current language
   */
  setLanguage(language: Language) {
    this.currentLanguage = language;
  }

  /**
   * Get current language
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Transcribe audio file using OpenAI Whisper API
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    if (!this.openaiApiKey || this.openaiApiKey === 'sk-your-openai-api-key-here' || this.openaiApiKey.length < 50) {
      // Mock transcription for testing when no valid API key is configured
      console.log('[VoiceService] Using mock transcription (no valid API key configured)');
      
      // Return mock transcriptions based on language
      const mockTranscriptions = this.currentLanguage === 'ur' 
        ? [
            'بلب 1 چالو کریں',
            'فین 1 بند کریں', 
            'گیٹ کھولیں',
            'بلب 2 چالو کریں',
            'فین 2 چالو کریں'
          ]
        : [
            'turn on bulb 1',
            'turn off fan 1',
            'open the gate',
            'turn on bulb 2', 
            'turn off fan 2'
          ];
      
      // Return a random mock transcription
      const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
      const transcription = mockTranscriptions[randomIndex];
      
      console.log(`[VoiceService] Mock transcribed: "${transcription}"`);
      return transcription;
    }

    try {
      const formData = new FormData();
      
      // Read file and append to form data
      const uriParts = audioUri.split('.');
      const fileType = (uriParts[uriParts.length - 1] || 'm4a').toLowerCase();
      const mimeType = fileType === 'wav'
        ? 'audio/wav'
        : fileType === 'caf'
          ? 'audio/x-caf'
          : 'audio/m4a';
      
      formData.append('file', {
        uri: audioUri,
        type: mimeType,
        name: `audio.${fileType}`,
      } as any);
      
      // Set language for Whisper
      formData.append('language', this.currentLanguage === 'ur' ? 'ur' : 'en');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');

      console.log(`[VoiceService] Sending audio to Whisper (${this.currentLanguage})...`);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = error?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Whisper API error: ${message}`);
      }

      const data = await response.json();
      const transcription = String(data?.text || '').trim().toLowerCase();
      if (!transcription) {
        throw new Error('No speech detected in recording');
      }

      console.log(`[VoiceService] Transcribed: "${transcription}"`);
      return transcription;
    } catch (error) {
      console.error('[VoiceService] Transcription error:', error);
      throw error;
    }
  }

  /**
   * Match transcribed text to available commands using fuzzy matching
   */
  matchCommand(transcription: string): VoiceCommand | null {
    const text = normalizeText(transcription);
    if (!text) return null;

    const searchOrder: Language[] =
      this.currentLanguage === 'ur' ? ['ur', 'en'] : ['en', 'ur'];

    let bestMatch: { command: DatasetCommand; score: number; language: Language } | null = null;

    for (const language of searchOrder) {
      for (const command of DATASET) {
        for (const phrase of command.utterances[language] || []) {
          const normalizedPhrase = normalizeText(phrase);
          if (!normalizedPhrase) continue;

          if (text === normalizedPhrase) {
            return toVoiceCommand(command, this.currentLanguage);
          }

          const containsMatch =
            text.includes(normalizedPhrase) || normalizedPhrase.includes(text);
          const similarity = containsMatch
            ? 0.9
            : this.calculateSimilarity(text, normalizedPhrase);

          if (!bestMatch || similarity > bestMatch.score) {
            bestMatch = { command, score: similarity, language };
          }
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    const threshold = bestMatch.language === this.currentLanguage ? 0.68 : 0.78;
    if (bestMatch.score < threshold) {
      return null;
    }

    return toVoiceCommand(bestMatch.command, this.currentLanguage);
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string): Promise<void> {
    try {
      await Speech.speak(text, {
        language: this.currentLanguage === 'ur' ? 'ur-PK' : 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('[VoiceService] TTS error:', error);
    }
  }

  /**
   * Stop speaking
   */
  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('[VoiceService] Stop speaking error:', error);
    }
  }

  /**
   * Get all available commands for current language
   */
  getAvailableCommands(): VoiceCommand[] {
    return this.currentLanguage === 'ur' ? URDU_COMMANDS : AVAILABLE_COMMANDS;
  }
}

export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;
