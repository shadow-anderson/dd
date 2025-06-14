// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);