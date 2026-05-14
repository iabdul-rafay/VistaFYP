import React from 'react';
import { StyleSheet, Text, View, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScale } from '@/hooks/useScale';

const GRADIENT_START = '#00C4CC';
const BLUE_PRIMARY = '#438c8cff';
const GRADIENT_END = '#008080';

export default function PageHeader({ title, subtitle, icon }: any) {
  const insets = useSafeAreaInsets();
  const { sText, sIcon } = useScale();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <LinearGradient
        colors={[GRADIENT_START, BLUE_PRIMARY, GRADIENT_END]}
        style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 10 }]}
      >
        <View style={styles.titleRow}>
          {icon && (
            <View style={[styles.iconBg, { width: sIcon(38), height: sIcon(38), borderRadius: sIcon(87) }]}>
              {icon}
            </View>
          )}
          <Text style={[styles.title, { fontSize: sText(26) }]}>{title}</Text>
        </View>
        <Text style={[styles.subtitle, { fontSize: sText(16) }]}>{subtitle}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: GRADIENT_START },
  header: { width: '100%', paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  iconBg: { backgroundColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { fontWeight: 'bold', color: '#fff' },
  subtitle: { color: 'rgba(255, 255, 255, 0.95)', fontWeight: '500' },
});