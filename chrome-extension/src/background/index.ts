/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable func-style */

import 'webextension-polyfill';

// Ring buffer to store the last 2000 events
const MAX_EVENTS = 2000;
const eventBuffer: any[] = [];
let eventId = 0;

// Store connections to DevTools panels
const devtoolsConnections = new Set<chrome.runtime.Port>();

// Add event to ring buffer
function addEvent(eventData: any) {
  const eventWithId = {
    ...eventData,
    id: ++eventId,
    timestamp: Date.now(),
  };

  eventBuffer.push(eventWithId);

  // Maintain ring buffer size
  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.shift();
  }

  // Send to all connected DevTools panels
  const message = {
    type: 'EVENT_WATCHER_NEW_EVENT',
    data: eventWithId,
  };

  devtoolsConnections.forEach(port => {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error('[Event Watcher] Failed to send message to DevTools:', error);
      devtoolsConnections.delete(port);
    }
  });
}

// Listen for events from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EVENT_WATCHER_EVENT') {
    addEvent(message.data);
    sendResponse({ success: true });
  }
});

// Handle DevTools panel connections
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'event-watcher-devtools') {
    devtoolsConnections.add(port);

    // Send existing events to the newly connected panel
    const existingEvents = eventBuffer.slice(-100); // Send last 100 events
    port.postMessage({
      type: 'EVENT_WATCHER_INIT',
      data: existingEvents,
    });

    // Handle port disconnection
    port.onDisconnect.addListener(() => {
      console.log('[Event Watcher] DevTools panel disconnected');
      devtoolsConnections.delete(port);
    });
  }
});
