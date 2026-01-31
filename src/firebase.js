import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
