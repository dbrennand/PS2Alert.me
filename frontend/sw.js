/**
 * https://ps2alert.me Service Worker
 * Licensed under the GNU GENERAL PUBLIC LICENSE
 */
// https://github.com/jakearchibald/idb-keyval#all-bundles
// idb-keyval creates a IndexedDB database with `get` and `set` operations
self.importScripts("https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js");

const publicVapidKey = "";

/**
 * Function taken from https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
 * @param {string} base64String A base64 string.
 * @returns A Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Set the subscription in IndexedDB.
 * @param subscription The JSON representation of a PushSubscription object.
 */
async function setSubscription(subscription) {
  await idbKeyval.set("subscription", subscription);
}

/**
 * Delete the subscription in IndexedDB.
 */
async function deleteSubscription() {
  await idbKeyval.del("subscription");
}

/**
 * Update subscription when a pushsubscriptionchange is fired.
 */
async function updateSubscription() {
  const oldSubscription = JSON.parse(await idbKeyval.get("subscription"));
  // Create a new subscription
  self.registration.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    })
    .then((newSubscription) => {
      console.log("Updating subscription.");
      setSubscription(JSON.stringify(newSubscription));
      fetch("/api/patch-subscription", {
        method: "PATCH",
        body: JSON.stringify({
          oldSubscription: oldSubscription,
          newSubscription: newSubscription,
        }),
        headers: { "Content-Type": "application/json" },
      });
    })
    .catch((err) => {
      console.error(`Failed to update subscription: ${err}`);
    });
}

/**
 * Post message event listener.
 */
self.addEventListener("message", (event) => {
  if (event.data.action === "SAVE_SUBSCRIPTION") {
    console.log("Saving subscription.");
    event.waitUntil(setSubscription(event.data.subscription));
  } else if (event.data.action === "DELETE_SUBSCRIPTION") {
    console.log("Deleting subscription.");
    event.waitUntil(deleteSubscription());
  }
});

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event
 * Pushsubscriptionchange event listener.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Subscription change fired. Updating subscription.");
  event.waitUntil(updateSubscription());
});

/**
 * Push notification event listener.
 */
self.addEventListener("push", (event) => {
  const data = event.data.json();
  // Show push notification
  self.registration.showNotification(data.title, {
    body: data.body,
    vibrate: [200, 100, 200, 100, 200],
    icon: "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/microsoft/209/police-cars-revolving-light_1f6a8.png",
  });
});
