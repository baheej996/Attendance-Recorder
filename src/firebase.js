import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
    projectId: "samasthaelearning-1487e",
    appId: "1:907209634397:web:d41031a3ad96103fae13b4",
    storageBucket: "samasthaelearning-1487e.firebasestorage.app",
    apiKey: "AIzaSyC-02qiwgqEtF1UpHvUkE2FNPm1iqGLPP0",
    authDomain: "samasthaelearning-1487e.firebaseapp.com",
    messagingSenderId: "907209634397",
    measurementId: "G-GBKJL2VF0D"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Use local emulators if running on localhost
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.warn("Connected to Firebase Firestore Local Emulator!");
}
