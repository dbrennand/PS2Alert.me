// Public VAPID key
const publicVapidKey = "";

// Function taken from: https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Function to get Cross-Site Request Forgery (CSRF) token
const getCsrfToken = () => {
  console.log('Getting CSRF token.');
  return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
};

// Code snippet adapted from: https://github.com/fgerschau/web-push-notification-example/blob/master/client/index.js
// Function to set subscribe message based on whether the user is subscribed to push notifications or not
const setSubscribeMessage = async () => {
  console.log('Setting subscribe message.')
  const subscribedElement = document.getElementById('subscribed');
  const unsubscribedElement = document.getElementById('unsubscribed');
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    subscribedElement.setAttribute('class', `${subscription ? '' : 'd-none'} fs-5`);
    unsubscribedElement.setAttribute('class', `${subscription ? 'd-none' : ''} fs-5`);
  } catch (error) {
    console.log("No registration found. Not subscribed.");
    // Hide subscribed message
    subscribedElement.setAttribute('class', 'd-none fs-5');
    // Show unsubscribed message
    unsubscribedElement.setAttribute('class', 'fs-5');
  }
};


// Code inspiration from: https://felixgerschau.com/web-push-notifications-tutorial/
// Logic for when a user presses the subscribe button
// Subscribe to push notifications
const subscribeToPushNotifications = async () => {
  // Check if Service Workers are supported in the browser
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready#example
  if ('serviceWorker' in navigator) {
    console.log('Browser supports Service Workers. Registering Service Worker.');
    // Register the Service Worker
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('Waiting for Service Worker to be ready...');
    await navigator.serviceWorker.ready.then(async function (registration) {
      console.log('Service Worker registered and active.');
      // Get selected server(s) from select element
      const selectElement = document.getElementById('server-select');
      const servers = [...selectElement.selectedOptions]
        .map(option => option.value);
      // Check servers is populated with at least one ID
      if (!(servers.length)) {
        console.error('Select at least one server to subscribe to push notifications.');
        return;
      }
      console.log(`Server IDs selected: ${servers}`);
      // Subscribe to push notifications
      console.log('Subscribing to push notifications.');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });
      // Create object containing selected server(s) and subscription data
      const data = {
        servers: servers,
        subscription: subscription
      };
      console.log(`Subscription endpoint: ${data.subscription.endpoint}`);
      // Send subscription information to the backend API
      await fetch('/add-subscription', {
        credentials: 'same-origin',
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': getCsrfToken()
        }
      });
      setSubscribeMessage();
    });
  } else {
    console.log('Browser does not support Service Workers.');
    return;
  };
};

// Logic for when a user presses the unsubscribe button
// Unsubscribe from push notifications
const unsubscribeFromPushNotifications = async () => {
  console.log('Getting registration to unsubscribe from push notifications.');
  // Get registration
  await navigator.serviceWorker.getRegistration()
    .then(async function (registration) {
      // Get current subscription
      console.log('Getting subscription to unsubscribe from push notifications.');
      const subscription = await registration.pushManager.getSubscription();
      // Send backend API request to unsubscribe from push notifications
      console.log('Removing subscription.')
      await fetch('/remove-subscription', {
        credentials: 'same-origin',
        method: 'DELETE',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': getCsrfToken()
        }
      });
      console.log('Unsubscribing from push notifications.')
      await subscription.unsubscribe();
      // Finally, remove Service Worker
      console.log('Removing Service Worker.')
      await registration.unregister();
      console.log('Successfully unsubscribed from push notifications.');
      setSubscribeMessage();
    });
}

// Add event listeners for subscribe and unsubscribe events
document.getElementById('subscribebutton').addEventListener('click', subscribeToPushNotifications);
document.getElementById('unsubscribebutton').addEventListener('click', unsubscribeFromPushNotifications);

// Show Bootstrap modal for cookie
const cookieModalEl = document.getElementById('cookiemodal');
new bootstrap.Modal(cookieModalEl).show();

// Set subscribe message when loading the page
setSubscribeMessage();
