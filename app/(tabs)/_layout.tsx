import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// 🎨 --- UNIFIED TEAL/AQUA COLORS (Matches Home Screen) --- 🎨
const BLUE_PRIMARY = '#008080';           // Medium Teal (Accent Color)
const BUTTON_GRADIENT_START = '#00C4CC';  // Bright Aqua
const BUTTON_GRADIENT_END = '#008080';    // Medium Teal
const TAB_BAR_BACKGROUND = '#f8f9fa';     // Light background (same as your home container)
const ACTIVE_TAB_COLOR = BLUE_PRIMARY;    // Active tab uses teal
const INACTIVE_TAB_COLOR = '#666666';     // Inactive tab color

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          borderTopColor: '#e0e0e0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: ACTIVE_TAB_COLOR,
        tabBarInactiveTintColor: INACTIVE_TAB_COLOR,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gesture"
        options={{
          title: 'Gesture',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "hand-left" : "hand-left-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "mic" : "mic-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}