const CACHE_NAME = "vitaltrack-v1.0.0";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching app shell...");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Service Worker installed successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker installation failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline page or default response
          if (event.request.destination === "document") {
            return caches.match("/");
          }
        });
    })
  );
});

// Background sync for data backup
self.addEventListener("sync", (event) => {
  if (event.tag === "health-data-backup") {
    event.waitUntil(
      // Perform background sync operations
      syncHealthData()
    );
  }
});

async function syncHealthData() {
  // This would sync data to a server if you had one
  // For now, just log that sync was attempted
  console.log("Background sync triggered for health data");
}

// Push notifications
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "Time to check your health goals!",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    vibrate: [200, 100, 200],
    tag: "health-reminder",
    actions: [
      {
        action: "open",
        title: "Open VitalTrack",
        icon: "/icon-72x72.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/icon-72x72.png",
      },
    ],
    data: {
      url: "/",
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification("VitalTrack Health Reminder", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Periodic background sync (experimental)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-health-reminder") {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  const options = {
    body: "Don't forget to log your health data today!",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    tag: "daily-reminder",
    requireInteraction: false,
    silent: false,
  };

  return self.registration.showNotification("Daily Health Check", options);
}

// Error handling
self.addEventListener("error", (event) => {
  console.error("Service Worker error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker unhandled rejection:", event.reason);
});

// Message handling from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
