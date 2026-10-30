import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    getFirestore,
    connectFirestoreEmulator,
    persistentLocalCache,
    persistentMultipleTabManager,
    memoryLocalCache
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

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
// Persistent (IndexedDB) cache: when a listener re-attaches or the app is reopened,
// Firestore resumes from the cached snapshot and only bills documents that changed,
// instead of re-reading the full result set. Falls back to the in-memory cache when
// IndexedDB is unavailable (private mode, some WebViews).
const createDb = () => {
    try {
        return initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (e) {
        console.warn('Persistent Firestore cache unavailable, using memory cache:', e);
        try {
            return initializeFirestore(app, { localCache: memoryLocalCache() });
        } catch {
            return getFirestore(app);
        }
    }
};

export const db = createDb();
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Use local emulators if running on localhost unless live database is requested
const connectToLive = import.meta.env.VITE_CONNECT_TO_LIVE === 'true' || import.meta.env.VITE_USE_EMULATORS === 'false';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isLocalhost && !connectToLive) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.warn("Connected to Firebase Firestore and Storage Local Emulators!");
} else {
    console.log("Connected to live Firebase Production Database!");
}
