importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkVxa2Sl_n2ilctVtAMAR08_YodZs_2qc",
  authDomain: "mikes-sport-picks.firebaseapp.com",
  projectId: "mikes-sport-picks",
  storageBucket: "mikes-sport-picks.appspot.com",
  messagingSenderId: "194004518324",
  appId: "1:194004518324:web:b16f742de1f2cef1f25ee1",
  measurementId: "G-CX80D31MNE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle Background Notifications
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Background Message:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});
