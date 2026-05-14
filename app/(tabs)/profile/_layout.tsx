import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="connectivity" 
        options={{ 
          title: 'Connectivity',
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          title: 'History',
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: 'Settings',
          headerBackTitle: 'Back'
        }} 
      />
      
    </Stack>
  );
}