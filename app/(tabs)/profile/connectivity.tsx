import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useScale } from '@/hooks/useScale';
import BluetoothConnection from '@/components/BluetoothConnection';

const BORDER_GRADIENT_START = '#59bfcaff';
const BORDER_GRADIENT_END = '#008080';
const CARD_INNER_BACKGROUND = '#FFFFFF';
const BLUE_PRIMARY = '#008080';

export default function ConnectivityContent() {
  const { sText, sIcon, isLarge } = useScale();

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollPadding}
    >
      {/* --- Connected via Wi-Fi Card --- */}
      <LinearGradient
        colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardWrapper}
      >
        <View style={[styles.cardInner, { padding: isLarge ? 22 : 18 }]}>
          <View style={styles.row}>
            <Ionicons name="wifi" size={sIcon(26)} color={BLUE_PRIMARY} />
            <View style={[styles.infoBox, { marginLeft: isLarge ? 16 : 12 }]}>
              <Text style={[styles.title, { fontSize: sText(18) }]}>Connected via Wi-Fi</Text>
              <Text style={[styles.subtitle, { fontSize: sText(14) }]}>Home Network • Strong signal</Text>
            </View>
            <Ionicons name="cellular" size={sIcon(26)} color={BLUE_PRIMARY} />
          </View>
        </View>
      </LinearGradient>

      {/* --- Bluetooth Connection Component --- */}
      <BluetoothConnection />

      {/* --- Detailed WiFi Card --- */}
      <LinearGradient
        colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardWrapper}
      >
        <View style={[styles.cardInner, { padding: isLarge ? 22 : 18 }]}>
          <Text style={[styles.heading, { fontSize: sText(18) }]}>Wi-Fi Connection</Text>

          <Text style={[styles.label, { fontSize: sText(16) }]}>Status</Text>
          <Text style={[styles.connectedText, { fontSize: sText(14) }]}>Connected to Home Network</Text>

          <View style={styles.detailBox}>
            <View style={styles.detailRow}>
               <Text style={[styles.detailLabel, { fontSize: sText(14) }]}>Network:</Text>
               <Text style={[styles.detailValue, { fontSize: sText(14) }]}>Home_Network_5G</Text>
            </View>
            <View style={styles.detailRow}>
               <Text style={[styles.detailLabel, { fontSize: sText(14) }]}>Signal:</Text>
               <Text style={[styles.detailValue, { fontSize: sText(14) }]}>Strong</Text>
            </View>
            <View style={styles.detailRow}>
               <Text style={[styles.detailLabel, { fontSize: sText(14) }]}>IP Address:</Text>
               <Text style={[styles.detailValue, { fontSize: sText(14) }]}>192.168.1.105</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // MATCHES SETTINGS & HISTORY: Consistent 12px horizontal padding
  scrollPadding: { 
    paddingVertical: 15, 
    paddingHorizontal: 12 
  },
  cardWrapper: {
    borderRadius: 18,
    padding: 1.5,
    marginBottom: 20,
    // Consistent High-End Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardInner: {
    backgroundColor: CARD_INNER_BACKGROUND,
    borderRadius: 16.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  infoBox: { flex: 1 },
  title: { fontWeight: 'bold', color: '#333' },
  subtitle: { color: '#666', marginTop: 2 },
  heading: { fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontWeight: '600', color: '#333', marginBottom: 4 },
  connectedText: { color: BLUE_PRIMARY, marginBottom: 15, fontWeight: '700' },
  detailBox: { 
    marginTop: 5, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    paddingTop: 15 
  },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  detailLabel: { color: '#888', fontWeight: '500' },
  detailValue: { color: '#333', fontWeight: '600' },
});