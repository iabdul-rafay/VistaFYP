import { useScale } from '@/hooks/useScale';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DeviceCard = ({ 
  device, 
  gradientStart, 
  gradientEnd, 
  cardBackground, 
  iconName, 
  iconColor, 
  iconBgColor, 
  toggleOnColor, 
  toggleOffColor, 
  onToggle, 
  isLoading = false,
  isDisabled = false,
  children 
}: any) => {
  const { sText, sIcon, isLarge } = useScale();
  const isActive = device.value === true || device.value > 0;

  return (
    <LinearGradient colors={[gradientStart, gradientEnd]} style={styles.cardGradientWrapper}>
      <View style={[styles.cardInner, { backgroundColor: cardBackground, opacity: isDisabled ? 0.5 : 1 }]}>
        <View style={styles.mainRow}>
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor, width: sIcon(44), height: sIcon(44), borderRadius: sIcon(22) }]}>
              <Ionicons name={iconName} size={sIcon(24)} color={iconColor} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceName, { fontSize: sText(16) }]}>{device.name}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? '#4CAF50' : '#9E9E9E' }]} />
                <Text style={[styles.statusText, { fontSize: sText(13) }]}>{device.details}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.toggleButton, { backgroundColor: isActive ? toggleOnColor : toggleOffColor, width: sIcon(52), height: sIcon(28) }]}
            onPress={onToggle}
            disabled={isLoading || isDisabled}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={[styles.toggleInnerCircle, { transform: [{ translateX: isActive ? sIcon(24) : 0 }], width: sIcon(24), height: sIcon(24) }]} />
            )}
          </TouchableOpacity>
        </View>
        {children && <View style={styles.extraContent}>{children}</View>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardGradientWrapper: { borderRadius: 15, padding: 1.5, marginBottom: 12 },
  cardInner: { padding: 15, borderRadius: 13.5 },
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  deviceInfo: { flex: 1 },
  deviceName: { fontWeight: '700', color: '#333' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#666' },
  toggleButton: { borderRadius: 14, paddingHorizontal: 2, justifyContent: 'center' },
  toggleInnerCircle: { backgroundColor: '#FFF', borderRadius: 12, elevation: 3 },
  extraContent: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0' }
});

export default DeviceCard;