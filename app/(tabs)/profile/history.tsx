import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../../context/settingsContext';
import { useScale } from '@/hooks/useScale';

const BLUE_PRIMARY = '#008080';
const BORDER_GRADIENT_START = '#59bfcaff';
const BORDER_GRADIENT_END = '#008080';

export default function HistoryContent() {
  const { history } = useSettings();
  const { sText, sIcon, isLarge } = useScale();

  // Helper to match icons with Dashboard/Home Screen
  const getIcon = (command: string, savedIcon: string) => {
    const cmd = command.toLowerCase();
    if (cmd.includes('bulb') || cmd.includes('light')) return 'bulb-outline';
    if (cmd.includes('fan')) return 'snow-outline';
    if (cmd.includes('gate') || cmd.includes('door')) return 'key-outline';
    return savedIcon || 'flash-outline';
  };

  const formatTime = (ts: number) => {
    if (!ts) return 'Just now';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={sIcon(50)} color="#ddd" />
        <Text style={[styles.emptyText, { fontSize: sText(14) }]}>No commands executed yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollPadding}
    >
      {/* Reverse to show latest logs at the top */}
      {[...history].reverse().map((item) => (
        <View key={item.id} style={styles.cardWrapper}>
          <LinearGradient
            colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cardGradientBorder}
          >
            <View style={[styles.cardInner, { padding: isLarge ? 16 : 12 }]}>
              {/* Top Row: Icon and Command Info */}
              <View style={styles.headerRow}>
                <View style={[
                  styles.iconContainer, 
                  { 
                    width: sIcon(38), 
                    height: sIcon(38), 
                    borderRadius: sIcon(19),
                    marginRight: isLarge ? 16 : 12 
                  }
                ]}>
                  {/* Updated icon logic to match Dashboard */}
                  <Ionicons 
                    name={getIcon(item.command, item.icon) as any} 
                    size={sIcon(20)} 
                    color={BLUE_PRIMARY} 
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[styles.commandText, { fontSize: sText(15) }]}>{item.command}</Text>
                  <Text style={[styles.modeText, { fontSize: sText(11) }]}>
                    via <Text style={styles.modeHighlight}>{item.device}</Text>
                  </Text>
                </View>
              </View>

              {/* Bottom Row: Timestamp and Status */}
              <View style={[styles.footerRow, { paddingTop: isLarge ? 12 : 8 }]}>
                <Text style={[styles.timestamp, { fontSize: sText(11) }]}>{formatTime(item.timestamp)}</Text>
                <View style={styles.statusBadge}>
                    <View style={[styles.dot, { width: sIcon(6), height: sIcon(6) }]} />
                    <Text style={[styles.statusText, { fontSize: sText(10) }]}>SUCCESS</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { 
    paddingVertical: 15, 
    paddingHorizontal: 12 
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyText: { color: '#999', marginTop: 10 },
  
  cardWrapper: { 
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradientBorder: { padding: 1.5, borderRadius: 16 },
  cardInner: { backgroundColor: '#fff', borderRadius: 14.5 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { 
    backgroundColor: '#e6f0fa', justifyContent: 'center', 
    alignItems: 'center'
  },
  commandText: { fontWeight: '700', color: '#333' },
  modeText: { color: '#888', marginTop: 2 },
  modeHighlight: { color: BLUE_PRIMARY, fontWeight: 'bold', textTransform: 'uppercase' },
  
  footerRow: { 
    flexDirection: 'row', justifyContent:'space-between', 
    alignItems: 'center', borderTopWidth: 1, 
    borderTopColor: '#f5f5f5',
    marginTop: 10
  },
  timestamp: { color: '#999' },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  dot: { borderRadius: 10, backgroundColor: '#4CAF50', marginRight: 5 },
  statusText: { color: '#4CAF50', fontWeight: 'bold' }
});