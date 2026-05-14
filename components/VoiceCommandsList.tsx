/**
 * Voice Commands List Component
 * 
 * Displays all available voice commands for the selected language
 */

import { useScale } from '@/hooks/useScale';
import { VoiceCommand } from '@/services/voiceCommandService';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface VoiceCommandsListProps {
  visible: boolean;
  commands: VoiceCommand[];
  language: 'en' | 'ur';
  onClose: () => void;
}

const BLUE_PRIMARY = '#008080';
const BUTTON_GRADIENT_START = '#00C4CC';
const BUTTON_GRADIENT_END = '#008080';

export const VoiceCommandsList: React.FC<VoiceCommandsListProps> = ({
  visible,
  commands,
  language,
  onClose,
}) => {
  const { sText, sIcon } = useScale();

  const renderCommandItem = ({ item }: { item: VoiceCommand }) => (
    <View style={styles.commandItem}>
      <View style={styles.commandIconContainer}>
        <View style={[styles.commandIcon, { backgroundColor: BLUE_PRIMARY }]}>
          <Ionicons
            name={item.icon || 'flash'}
            size={sIcon(20)}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.commandContent}>
        <Text style={[styles.commandName, { fontSize: sText(16) }]}>
          {item.name}
        </Text>
        <Text style={[styles.commandAliases, { fontSize: sText(11) }]}>
          {item.aliases.slice(0, 2).join(', ')}
          {item.aliases.length > 2 ? '...' : ''}
        </Text>
      </View>

      <View style={styles.commandAction}>
        <Text style={[styles.actionBadge, { fontSize: sText(10) }]}>
          {item.action}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: sText(24) }]}>
              {language === 'ur' ? 'دستیاب کمانڈز' : 'Available Commands'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-down" size={sIcon(32)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Language Badge */}
          <View style={styles.languageBadge}>
            <Text style={[styles.languageBadgeText, { fontSize: sText(12) }]}>
              {language === 'ur' ? '🇵🇰 اردو' : '🇺🇸 English'}
            </Text>
          </View>

          {/* Commands List */}
          <FlatList
            data={commands}
            renderItem={renderCommandItem}
            keyExtractor={(item, index) => `${item.action}-${index}`}
            scrollEnabled
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
          />

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { fontSize: sText(16) }]}>
              Close
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  title: {
    fontWeight: '700',
    color: '#fff',
  },
  languageBadge: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  languageBadgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    marginHorizontal: 20,
    maxHeight: '75%',
  },
  listContent: {
    paddingBottom: 10,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  commandIconContainer: {
    marginRight: 12,
  },
  commandIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commandContent: {
    flex: 1,
  },
  commandName: {
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  commandAliases: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  commandAction: {
    marginLeft: 10,
  },
  actionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#008080',
    fontWeight: '700',
  },
});

export default VoiceCommandsList;
