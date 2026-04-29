importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    projectId: "samasthaelearning-1487e",
    appId: "1:907209634397:web:d41031a3ad96103fae13b4",
    storageBucket: "samasthaelearning-1487e.firebasestorage.app",
    apiKey: "AIzaSyC-02qiwgqEtF1UpHvUkE2FNPm1iqGLPP0",
    authDomain: "samasthaelearning-1487e.firebaseapp.com",
    messagingSenderId: "907209634397",
    measurementId: "G-GBKJL2VF0D"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
