// Service Worker
self.addEventListener('push', (event) => {
    // Convert event data to JSON
    const data = event.data.json();
    // Show push notification
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '🚨',
    });
});
