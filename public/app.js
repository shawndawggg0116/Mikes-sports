// public/app.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(registration => {
    console.log('Service Worker registered with scope:', registration.scope);

    // Request permission for notifications
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      } else {
        console.log('Notification permission denied.');
      }
    });
  }).catch(error => {
    console.error('Service Worker registration failed:', error);
  });
}

// Assuming you have other client-side logic here like your login function