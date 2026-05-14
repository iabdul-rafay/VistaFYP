import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { 
  ScrollView, StyleSheet, Text, TouchableOpacity, 
  View, Modal, TextInput, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import PageHeader from '../../../components/PageHeader';
import ConnectivityContent from './connectivity';
import HistoryContent from './history';
import SettingsContent from './settings';
import { useSettings } from '../../../context/settingsContext';
import { useScale } from '@/hooks/useScale';

const BLUE_PRIMARY = '#008080';
const BUTTON_GRADIENT_START = '#00C4CC';
const BUTTON_GRADIENT_END = '#008080';
const BORDER_GRADIENT_START = '#59bfcaff';
const BORDER_GRADIENT_END = '#008080';
const CARD_INNER_BACKGROUND = '#FFFFFF';

type TabType = 'history' | 'connectivity' | 'settings';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const { userName, userEmail, updateProfile } = useSettings();
  const { sText, sIcon, isLarge } = useScale();

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [newEmail, setNewEmail] = useState(userEmail);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'history', label: 'History', icon: 'time-outline' },
    { id: 'connectivity', label: 'Network', icon: 'wifi-outline' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  const handleSave = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      Alert.alert("Error", "Fields cannot be empty");
      return;
    }
    try {
      await updateProfile(newName, newEmail);
      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  return (
    <View style={styles.container}>
      {/* --- FIXED SECTION (Does not scroll) --- */}
      <View style={styles.fixedHeaderContainer}>
        <PageHeader
          title="Profile"
          subtitle="Manage settings and preferences"
          icon={<Ionicons name="person" size={sIcon(24)} color="#fff" />}
        />

        <View style={styles.fixedContentPadding}>
          {/* USER INFO CARD */}
          <LinearGradient
            colors={[BORDER_GRADIENT_START, BORDER_GRADIENT_END]}
            style={styles.profileCardGradientWrapper}
          >
            <View style={styles.profileCardInner}>
              <View style={[styles.avatar, { width: sIcon(44), height: sIcon(44), borderRadius: sIcon(22) }]}>
                <Text style={[styles.avatarText, { fontSize: sText(18) }]}>
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={[styles.userName, { fontSize: sText(18) }]} numberOfLines={1}>{userName}</Text>
                <Text style={[styles.userEmail, { fontSize: sText(12) }]} numberOfLines={1}>{userEmail}</Text>
              </View>

              <TouchableOpacity
                style={styles.settingsIcon}
                onPress={() => {
                  setNewName(userName);
                  setNewEmail(userEmail);
                  setEditModalVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={sIcon(22)} color={BLUE_PRIMARY} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ADAPTIVE TABS */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity 
                  key={tab.id} 
                  style={styles.tabButton} 
                  onPress={() => setActiveTab(tab.id)}
                >
                  <LinearGradient
                    colors={isActive ? [BUTTON_GRADIENT_START, BUTTON_GRADIENT_END] : ['#f0f0f0', '#f0f0f0']}
                    style={[
                      styles.tabButtonGradient,
                      isLarge && { paddingVertical: 12 }
                    ]}
                  >
                    <Ionicons 
                      name={tab.icon as any} 
                      size={isLarge ? sIcon(26) : 18} 
                      color={isActive ? '#fff' : '#666'} 
                    />
                    {!isLarge && (
                      <Text style={[
                        styles.tabText, 
                        { fontSize: sText(13) },
                        isActive ? styles.activeTabText : { color: '#666' }
                      ]}>
                        {tab.label}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* --- SCROLLABLE CONTENT --- */}
      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        <View style={styles.contentCardInner}>
          {activeTab === 'history' && <HistoryContent />}
          {activeTab === 'settings' && <SettingsContent />}
          {activeTab === 'connectivity' && <ConnectivityContent />}
        </View>
      </ScrollView>

      {/* EDIT MODAL */}
      <Modal visible={isEditModalVisible} animationType="fade" transparent={true}>
         <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <Text style={[styles.modalTitle, {fontSize: sText(20)}]}>Update Profile</Text>
             <TextInput style={[styles.input, {fontSize: sText(16)}]} placeholder="Name" value={newName} onChangeText={setNewName} />
             <TextInput style={[styles.input, {fontSize: sText(16)}]} placeholder="Email" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
             <View style={styles.modalButtons}>
               <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                 <Text style={[styles.cancelBtnText, {fontSize: sText(14)}]}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={handleSave}>
                 <LinearGradient colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]} style={styles.saveBtn}>
                   <Text style={[styles.saveBtnText, {fontSize: sText(14)}]}>Save</Text>
                 </LinearGradient>
               </TouchableOpacity>
             </View>
           </View>
         </KeyboardAvoidingView>
       </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  // Fixed Header Styles
  fixedHeaderContainer: { backgroundColor: '#f8f9fa', zIndex: 10 },
  fixedContentPadding: { paddingHorizontal: 20, paddingTop: 15 },

  profileCardGradientWrapper: { borderRadius: 20, padding: 1.5, marginBottom: 15 },
  profileCardInner: { backgroundColor: CARD_INNER_BACKGROUND, borderRadius: 18.5, padding: 15, flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: BLUE_PRIMARY, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontWeight: '700', color: '#333' },
  userEmail: { color: '#888', marginTop: 2 },
  settingsIcon: { padding: 8, borderRadius: 12, backgroundColor: '#f0f7f7' },
  
  tabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#eee', 
    borderRadius: 12, 
    padding: 4,
    marginBottom: 5
  },
  tabButton: { flex: 1, marginHorizontal: 2 },
  tabButtonGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  tabText: { fontWeight: '600', marginLeft: 8 },
  activeTabText: { color: '#fff' },

  // Scroll Content Styles
  scrollContent: { flex: 1 },
  scrollPadding: { paddingHorizontal: 20, paddingBottom: 40 },
  contentCardInner: { marginTop: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25 },
  modalTitle: { fontWeight: 'bold', color: BLUE_PRIMARY, marginBottom: 20, textAlign: 'center' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ccc', marginBottom: 20, padding: 8, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});