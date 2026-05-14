// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYWloYnLhWpJwzjOEHbAliZSVZUBtqyGg",
  authDomain: "my-vista-iot.firebaseapp.com",
  databaseURL: "https://my-vista-iot-default-rtdb.firebaseio.com",
  projectId: "my-vista-iot",
  storageBucket: "my-vista-iot.firebasestorage.app",
  messagingSenderId: "1053058020942",
  appId: "1:1053058020942:web:8f5251527d364eee1ff51f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const storage = getStorage(app);
