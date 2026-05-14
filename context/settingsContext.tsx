import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { ref, onValue, set, push, serverTimestamp } from 'firebase/database';
import { database } from '../services/firebase';

export interface HistoryItem {
  id: string;
  command: string;
  device: string;
  timestamp: number;
  icon: string;
}

interface SettingsContextType {
  largeText: boolean;
  setLargeText: (val: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (val: boolean) => void;
  userName: string;
  userEmail: string;
  updateProfile: (name: string, email: string) => Promise<void>;
  history: HistoryItem[];
  addHistoryItem: (command: string, device: string, icon: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [largeText, setLargeText] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userName, setUserName] = useState('Hamna Gul');
  const [userEmail, setUserEmail] = useState('hamnagulmalik@gmail.com');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const profileRef = ref(database, 'user_profile');
    const historyRef = ref(database, 'command_history');

    const unsubProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.details) {
          setUserName(data.details.name || 'Hamna Gul');
          setUserEmail(data.details.email || 'hamnagulmalik@gmail.com');
        }
        if (data.settings) {
          setLargeText(data.settings.largeText ?? false);
          setNotificationsEnabled(data.settings.notificationsEnabled ?? true);
        }
      }
    });

    const unsubHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyList: HistoryItem[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setHistory(historyList);
      } else {
        setHistory([]);
      }
    });

    return () => {
      unsubProfile();
      unsubHistory();
    };
  }, []);

  const addHistoryItem = async (command: string, device: string, icon: string) => {
    try {
      const historyRef = ref(database, 'command_history');
      await push(historyRef, {
        command,
        device,
        icon,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding history:", error);
    }
  };

  const updateProfile = async (name: string, email: string) => {
    try {
      await set(ref(database, 'user_profile/details'), { name, email });
    } catch (error) {
      console.error("Firebase Update Error:", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      largeText, setLargeText, notificationsEnabled, setNotificationsEnabled,
      userName, userEmail, updateProfile, history, addHistoryItem 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
};