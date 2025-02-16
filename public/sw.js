self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        self.registration.showNotification(data.notification.title, {
            body: data.notification.body,
            icon: data.notification.icon,
            vibrate: [200, 100, 200], // Optional: Vibrates on receive
        });
    } else {
        console.log('Push event but no data');
    }
});
