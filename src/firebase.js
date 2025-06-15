// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANg95WdxwaB8bw_AnQS8s2-AUCz_JmX9o",
  authDomain: "medi-yatra-clinics.firebaseapp.com",
  projectId: "medi-yatra-clinics",
  storageBucket: "medi-yatra-clinics.firebasestorage.app",
  messagingSenderId: "904574554357",
  appId: "1:904574554357:web:d43d13bbd843c00dcfb5bc",
  measurementId: "G-VKWS6QZL0X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics
const analytics = getAnalytics(app);

// Export the Firestore instance
export { db };