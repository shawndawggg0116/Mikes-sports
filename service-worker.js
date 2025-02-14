// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim().then(() => {
    scheduleWeeklyNotification();
  }));
});

self.addEventListener('push', (event) => {
  if (event.data) {
    const { title, body } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: 'icon.png'
      })
    );
  }
});

function scheduleWeeklyNotification() {
  const now = new Date();
  
  let nextTuesday = new Date(now);
  nextTuesday.setDate(nextTuesday.getDate() + ((((7 - nextTuesday.getDay()) % 7) + 2) % 7 || 7));
  nextTuesday.setHours(9); // Set time to 9 AM on Tuesday
  nextTuesday.setMinutes(0);
  nextTuesday.setSeconds(0);
  nextTuesday.setMilliseconds(0);

  const timeUntilNextTuesday = nextTuesday - now;

  setTimeout(() => {
    self.registration.showNotification('NFL Picks Reminder', {
      body: 'Don\'t forget to pick your NFL team this week!',
      icon: 'icon.png'
    });
    scheduleWeeklyNotification(); // Reschedule for the next week
  }, timeUntilNextTuesday);
}