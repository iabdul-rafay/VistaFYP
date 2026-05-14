import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BLUE_DARK = '#0c5c57ff';
const GRADIENT_START = '#00C4CC';
const GRADIENT_END = '#008080';

const BiometricIcon = ({ biometricType }: { biometricType: any }) => { 
  let icon = '🔒'; 
  if (biometricType === LocalAuthentication.AuthenticationType.FINGERPRINT) icon = '👆'; 
  else if (biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) icon = '👀'; 

  return (
    <View style={styles.lockIconContainer}>
      <Text style={styles.lockIcon}>{icon}</Text> 
    </View>
  );
};

const KeyIcon = () => (
  <View style={styles.keyIconContainer}>
    <Text style={styles.keyIcon}>🔑</Text>
  </View>
);

export default function AuthScreen() {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<null | LocalAuthentication.AuthenticationType>(null); 

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types && types.length > 0) setBiometricType(types[0]); 
      }
    })();
  }, []);

  const handleSuccessfulAuth = () => {
    router.replace('/home'); 
  };

  // --- 🛠️ UPDATED AUTHENTICATION LOGIC ---
  
  const handleAuth = async (isPasscodeOnly: boolean = false) => {
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!isBiometricSupported && !isPasscodeOnly) {
      Alert.alert("Error", "Biometrics not supported.");
      return;
    }

    // This triggers the REAL system prompt
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: isPasscodeOnly ? 'Confirm your passcode' : 'Unlock VISTA',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false, // Allows PIN/Passcode if biometrics fail
    });

    if (result.success) {
      handleSuccessfulAuth();
    } else {
      console.log("Auth failed or cancelled");
    }
  };

  const getBiometricPromptText = () => {
    if (biometricType === LocalAuthentication.AuthenticationType.FINGERPRINT) return "Use Fingerprint (Touch ID)";
    if (biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) return "Use Face ID";
    return "Use biometric authentication";
  };

  return (
    <LinearGradient colors={[GRADIENT_START, GRADIENT_END]} style={styles.container}>
      <BiometricIcon biometricType={biometricType} /> 
      
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Unlock your VISTA</Text>

      <View style={styles.authCard}>
        {/* Biometric Button */}
        <TouchableOpacity 
          style={styles.biometricButton} 
          onPress={() => handleAuth(false)} 
          disabled={!isBiometricSupported} 
        >
          <Text style={styles.biometricButtonText}>{getBiometricPromptText()}</Text>
        </TouchableOpacity>

        <View style={styles.orSeparator}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        {/* Password Button - Now correctly triggers system password prompt */}
        <TouchableOpacity 
          style={styles.passwordButton} 
          onPress={() => handleAuth(true)}
        >
          <KeyIcon />
          <Text style={styles.passwordButtonText}>Use Lock Screen Password</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Your device authentication will be used to unlock the app
        </Text>
      </View>
      
      <Text style={styles.securityNote}>Your security is our priority</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, 
              paddingHorizontal: 20, 
              justifyContent: 'center',
               alignItems: 'center' },

  lockIconContainer: { backgroundColor: 'rgba(255, 255, 255, 0.2)', 
             borderRadius: 50, 
             width: 80, 
             height: 80, 
             justifyContent: 'center',
            alignItems: 'center', 
            marginBottom: 20 },
  lockIcon: { fontSize: 40, color: '#fff' },
  keyIconContainer: {},
  keyIcon: { fontSize: 18, color: BLUE_DARK, marginRight: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 18, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 40 },
  authCard: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, padding: 30, alignItems: 'center' },
  biometricButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: 16, borderRadius: 12, width: '100%', marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
  biometricButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  orSeparator: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  orText: { color: 'rgba(255, 255, 255, 0.7)', marginHorizontal: 10, fontSize: 14 },
  passwordButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '100%' },
  passwordButtonText: { color: BLUE_DARK, fontSize: 16, fontWeight: '600' },
  note: { textAlign: 'center', marginTop: 20, color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 },
  securityNote: { textAlign: 'center', marginTop: 50, color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 },
});