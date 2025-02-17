self.addEventListener('push', event => {
    console.log("📢 Push Event Received:", event);

    if (event.data) {
        const data = event.data.json();
        console.log("📢 Notification Data:", data);
        
        self.registration.showNotification(data.notification.title, {
            body: data.notification.body,
            icon: data.notification.icon || "/icon.png",
            badge: "/badge.png", // Optional: iOS badge
            vibrate: [200, 100, 200], // Optional: Vibration
        });
    } else {
        console.warn("🚨 Push event but no data.");
    }
});
