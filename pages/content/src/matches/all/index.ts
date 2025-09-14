console.log('[Event Watcher] Content script loaded');

// Inject event monitoring script into the page's main world
const script = document.createElement('script');
script.src = chrome.runtime.getURL('event-monitor.js');
script.onload = () => {
  console.log('[Event Watcher] Event monitoring script loaded');
  script.remove();
};
script.onerror = () => {
  console.error('[Event Watcher] Failed to load event monitoring script');
};

// Inject the script into the page
(document.head || document.documentElement).appendChild(script);

// Listen for events from the injected script
window.addEventListener('message', event => {
  if (event.source !== window || event.data.type !== 'EVENT_WATCHER_EVENT') {
    return;
  }

  // Forward to background script
  chrome.runtime
    .sendMessage({
      type: 'EVENT_WATCHER_EVENT',
      data: event.data.data,
    })
    .catch(console.error);
});

console.log('[Event Watcher] Content script ready');
