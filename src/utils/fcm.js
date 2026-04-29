import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import { db } from '../firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = "BFgDx1_sEfWdGlXnms23J7OVMsrept1kiPTNG93Ov0BPo2a__HzAWPDGk2CrFscHeBNmAJpQa9M1289KuJrxAU0";

export const requestFirebaseNotificationPermission = async (userId) => {
    if (!messaging) return null;
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (token && userId) {
                // Store token in Firestore for this user
                // Using a dedicated userTokens collection
                const tokenRef = doc(db, 'userTokens', userId);
                await setDoc(tokenRef, {
                    fcmTokens: arrayUnion(token),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
                
                console.log('FCM Token registered for user:', userId);
                return token;
            }
        } else {
            console.warn('Notification permission denied');
        }
    } catch (error) {
        console.error('Error getting notification permission:', error);
    }
    return null;
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
