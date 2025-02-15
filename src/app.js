import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase config
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
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => console.log("Service Worker registered:", registration))
    .catch((err) => console.log("Service Worker registration failed:", err));
}

// Request Permission for Notifications
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    console.log("Notification permission granted.");
    
    getToken(messaging, { vapidKey: "BDxeWrtXOIPm27MeNeXygF6rRXma7L4A-efs6J8l2tFjiIOtXCFD0SyyRUeS2u8qE6PsOgFfiOXGSZChE1VInX4" }) 
      .then((currentToken) => {
        if (currentToken) {
          console.log("FCM Token:", currentToken);
          fetch("/register-fcm-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "USER_ID_HERE", fcmToken: currentToken }),
          });
        } else {
          console.log("No registration token available.");
        }
      })
      .catch((err) => console.log("Error getting token:", err));
  } else {
    console.log("Permission denied for notifications.");
  }
}

requestNotificationPermission();

function requestNotificationPermission() {
  Notification.requestPermission().then(permission => {
    console.log("Notification Permission:", permission);
    if (permission === "granted") {
      alert("✅ Notifications enabled!");
    } else {
      alert("❌ Notifications blocked. Enable them in browser settings.");
    }
  });
}


// Handle incoming foreground messages
onMessage(messaging, (payload) => {
  console.log("Message received: ", payload);
  alert(payload.notification.body);
});
