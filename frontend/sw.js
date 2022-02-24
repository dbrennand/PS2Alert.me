/**
 * https://ps2alert.me Service Worker
 * Licensed under the GNU GENERAL PUBLIC LICENSE
*/

// Import idb-keyval library: https://github.com/jakearchibald/idb-keyval#all-bundles
// Idb-keyval creates a IndexedDB database with simple operations such as `get` and `set`
self.importScripts('https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js');

// Service Worker functions

// Function to handle setting subscription
const setSubscription = async (subscription) => {
    await idbKeyval.set('subscription', subscription);
};

const deleteSubscription = async () => {
    await idbKeyval.del('subscription');
};

// Function to handle updating subscription
// Code inspiration from: https://medium.com/@madridserginho/how-to-handle-webpush-api-pushsubscriptionchange-event-in-modern-browsers-6e47840d756f
const updateSubscription = async () => {
    const oldSubscription = JSON.parse(await idbKeyval.get('subscription'));
    const newSubscription = await self.registration.pushManager.getSubscription();
    if (newSubscription.endpoint != oldSubscription.endpoint) {
        console.log('Subscription endpoints do not match. Updating subscription.');
        // Set new subscription
        await setSubscription(newSubscription);
        // Update subscription on the server
        await fetch('/update-subscription', {
            method: 'PATCH',
            body: JSON.stringify({
                oldSubscription: oldSubscription,
                newSubscription: newSubscription
            }),
            headers: { 'Content-Type': 'application/json' }
        });
    };
};

// Service Worker listeners

// Listener for saving and deleting subscription
self.addEventListener('message', (event) => {
    if (event.data.action === 'SAVE_SUBSCRIPTION') {
        console.log('Saving subscription.');
        event.waitUntil(setSubscription(event.data.subscription));
    }
    else if (event.data.action === 'DELETE_SUBSCRIPTION') {
        console.log('Deleting subscription.');
        event.waitUntil(deleteSubscription());
    };
});

// Listener for push subscription change
// Update old subscription with the new subscription
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Subscription change fired.');
    event.waitUntil(updateSubscription());
});

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
