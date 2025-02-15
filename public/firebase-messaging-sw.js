importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyAkVxa2Sl_n2ilctVtAMAR08_YodZs_2qc",
  authDomain: "mikes-sport-picks.firebaseapp.com",
  projectId: "mikes-sport-picks",
  storageBucket: "mikes-sport-picks.appspot.com",
  messagingSenderId: "194004518324",
  appId: "1:194004518324:web:b16f742de1f2cef1f25ee1",
  measurementId: "G-CX80D31MNE"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [200, 100, 200]
  });
});
