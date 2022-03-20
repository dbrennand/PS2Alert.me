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
 * Function to get Cross Site Request Forgery (CSRF) token.
 * @returns {string} The CSRF token.
 */
function getCsrfToken() {
  console.log("Getting CSRF token.");
  return document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");
}

/**
 * Set subscription status based on whether the user has an active subscription.
 */
function setSubscriptionStatus() {
  console.log("Setting subscription status.");
  const subscribedElement = document.getElementById("subscribed");
  const unsubscribedElement = document.getElementById("unsubscribed");
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      return registration.pushManager.getSubscription();
    })
    .then((subscription) => {
      // Set subscription status message based on whether the user is subscribed
      subscribedElement.setAttribute(
        "class",
        `${subscription ? "" : "d-none"}`
      );
      unsubscribedElement.setAttribute(
        "class",
        `${subscription ? "d-none" : ""}`
      );
      console.log("Successfully set subscription status.");
    })
    .catch((err) => {
      if (err.message === "registration is undefined") {
        console.log("Service Worker registration not found.");
      } else {
        console.error(`Failed to set subscription status: ${err}`);
      }
      // Hide subscribed message
      subscribedElement.setAttribute("class", "d-none");
    });
}

/**
 * Subscribe to PlanetSide 2 alert push notifications.
 */
async function subscribeToPushNotifications() {
  // Check if Service Workers are supported for the browser
  if ("serviceWorker" in navigator) {
    console.log("Registering Service Worker.");
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("Service Worker registration successful.");
        // Get selected PlanetSide 2 servers
        const checkedServers = [
          ...document.querySelectorAll("input:checked"),
        ].map((check) => check.value);
        if (!checkedServers.length) {
          console.error(
            "Check at least one PlanetSide 2 server to subscribe to push notification for."
          );
          return;
        }
        console.log(`PlanetSide 2 server IDs selected: ${checkedServers}`);
        console.log("Subscribing to push notifications.");
        registration.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
          })
          .then(async (subscription) => {
            // Send message to the Service Worker to save the subscription
            registration.active.postMessage({
              action: "SAVE_SUBSCRIPTION",
              subscription: JSON.stringify(subscription),
            });
            console.log(`Subscription endpoint: ${subscription.endpoint}`);
            await fetch("/api/post-subscription", {
              credentials: "same-origin",
              method: "POST",
              body: JSON.stringify({
                servers: checkedServers,
                subscription: subscription,
              }),
              headers: {
                "Content-Type": "application/json",
                "CSRF-Token": getCsrfToken(),
              },
            });
            setSubscriptionStatus();
          })
          .catch((err) => {
            console.error(`Failed to subscribe to push notifications: ${err}`);
          });
      })
      .catch((err) => {
        console.error(`Service Worker registration failed: ${err}`);
      });
  } else {
    console.error("Browser does not support Service Workers.");
    alert(
      "Your browser does not support Service Workers and therefore, you cannot use PS2Alert.me."
    );
  }
}

/**
 * Unsubscribe from PlanetSide 2 alert push notifications.
 */
async function unsubscribeFromPushNotifications() {
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      console.log(
        "Getting subscription to unsubscribe from push notifications."
      );
      registration.pushManager
        .getSubscription()
        .then(async (subscription) => {
          // Send message to the Service Worker to delete the subscription
          registration.active.postMessage({ action: "DELETE_SUBSCRIPTION" });
          console.log("Unsubscribing from push notifications.");
          await subscription.unsubscribe();
          await fetch("/api/delete-subscription", {
            credentials: "same-origin",
            method: "DELETE",
            body: JSON.stringify({ endpoint: subscription.endpoint }),
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": getCsrfToken(),
            },
          });
          await registration.unregister();
          setSubscriptionStatus();
        })
        .catch((err) => {
          console.error(
            `Failed to unsubscribe from push notifications: ${err}`
          );
        });
    })
    .catch((err) => {
      console.error(`Failed to get Service Worker registration: ${err}`);
    });
}

// Add event listeners for subscribe and unsubscribe events
document
  .getElementById("subscribe")
  .addEventListener("click", subscribeToPushNotifications);
document
  .getElementById("unsubscribe")
  .addEventListener("click", unsubscribeFromPushNotifications);

// Show Bootstrap modal
const cookieModal = document.getElementById("cookiemodal");
new bootstrap.Modal(cookieModal).show();

// Set subscribe message when loading the page
setSubscriptionStatus();
