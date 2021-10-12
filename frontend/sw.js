// Service Worker

// Listener for push events
self.addEventListener('push', (event) => {
    // Convert event data to JSON
    const data = event.data.json();
    // Show push notification
    self.registration.showNotification(data.title, {
        body: data.body,
        vibrate: [200, 100, 200, 100, 200],
        icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/microsoft/209/police-cars-revolving-light_1f6a8.png',
    });
});

// Listener for push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        fetch('/edit-subscription', {
            method: 'PATCH',
            body: JSON.stringify({
                oldEndpoint: event.oldSubscription.endpoint,
                newSubscription: event.newSubscription
            }),
            headers: { 'Content-Type': 'application/json' }
        })
    );
});
