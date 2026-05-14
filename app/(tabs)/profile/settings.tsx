import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "../../../context/settingsContext";
import { useScale } from "@/hooks/useScale";

const GRADIENT_START = "#00C4CC";
const GRADIENT_MID = "#438c8cff";
const GRADIENT_END = "#008080";

export default function SettingsContent() {
  const { largeText, setLargeText, notificationsEnabled, setNotificationsEnabled } = useSettings();
  const { sText, sIcon } = useScale();

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollPadding}
    >
      {/* Visual Accessibility Card */}
      <LinearGradient colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]} style={styles.gradientWrapper}>
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye" size={sIcon(20)} color={GRADIENT_START} />
            <Text style={[styles.cardHeaderText, { fontSize: sText(18) }]}>Visual Accessibility</Text>
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { fontSize: sText(16) }]}>Large Text & Icons</Text>
              <Text style={[styles.settingDescription, { fontSize: sText(14) }]}>Easier to read for older adults</Text>
            </View>
            <Switch 
              value={largeText} 
              onValueChange={setLargeText}
              trackColor={{ false: '#f0f0f0', true: GRADIENT_START }}
              thumbColor={largeText ? GRADIENT_END : '#f4f3f4'}
              style={{ transform: [{ scale: largeText ? 1.2 : 1 }] }}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Notifications Card */}
      <LinearGradient colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]} style={styles.gradientWrapper}>
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications" size={sIcon(20)} color={GRADIENT_START} />
            <Text style={[styles.cardHeaderText, { fontSize: sText(18) }]}>Notifications</Text>
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { fontSize: sText(16) }]}>Push Notifications</Text>
              <Text style={[styles.settingDescription, { fontSize: sText(14) }]}>Receive alerts and updates</Text>
            </View>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#f0f0f0', true: GRADIENT_START }}
              thumbColor={notificationsEnabled ? GRADIENT_END : '#f4f3f4'}
              style={{ transform: [{ scale: largeText ? 1.2 : 1 }] }}
            />
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { 
    paddingVertical: 15, 
    // Reduced from 20 to 12 to make the cards wider
    paddingHorizontal: 12 
  }, 
  gradientWrapper: { 
    borderRadius: 16, 
    padding: 1.5, 
    marginBottom: 20, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardInner: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 14.5, 
    padding: 16 
  },
  cardHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16 
  },
  cardHeaderText: { 
    fontWeight: "bold", 
    marginLeft: 8, 
    color: "#0c5c57ff" 
  },
  settingItem: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  settingInfo: { 
    flex: 1, 
    marginRight: 16 
  },
  settingName: { 
    fontWeight: "500", 
    marginBottom: 4, 
    color: "#0c5c57ff" 
  },
  settingDescription: { 
    color: "#666", 
    lineHeight: 20 
  },
});