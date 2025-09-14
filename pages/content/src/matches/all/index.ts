console.log('[Event Watcher] Content script loaded');

// Inject event monitoring script into the page's main world
const script = document.createElement('script');
script.textContent = `
  (function() {
    console.log('[Event Watcher] Event monitoring script injected');
    
    // Store original dispatchEvent function
    const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    let eventId = 0;
    
    // Create a safe JSON stringify function
    function safeStringify(obj, maxDepth = 3, currentDepth = 0) {
      if (currentDepth >= maxDepth) return '[Max Depth Reached]';
      
      if (obj === null) return 'null';
      if (typeof obj === 'undefined') return 'undefined';
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return JSON.stringify(obj);
      }
      
      if (obj instanceof Node) return '[DOM Node]';
      if (obj instanceof Blob) return '[Blob]';
      if (obj instanceof File) return '[File]';
      if (obj instanceof Date) return obj.toISOString();
      if (obj instanceof Error) return obj.toString();
      
      if (Array.isArray(obj)) {
        return '[' + obj.map(item => safeStringify(item, maxDepth, currentDepth + 1)).join(', ') + ']';
      }
      
      if (typeof obj === 'object') {
        try {
          const result = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              result[key] = safeStringify(obj[key], maxDepth, currentDepth + 1);
            }
          }
          return JSON.stringify(result);
        } catch (e) {
          return '[Circular Reference]';
        }
      }
      
      return '[Unknown Type]';
    }
    
    // Create a selector for the target element
    function getElementSelector(element) {
      if (!element || !element.nodeType) return '[Unknown Target]';
      
      if (element === document) return 'document';
      if (element === window) return 'window';
      
      try {
        if (element.id) return '#' + element.id;
        if (element.className && typeof element.className === 'string') {
          return element.tagName.toLowerCase() + '.' + element.className.split(' ').join('.');
        }
        return element.tagName ? element.tagName.toLowerCase() : '[Element]';
      } catch (e) {
        return '[Element]';
      }
    }
    
    // Override dispatchEvent
    EventTarget.prototype.dispatchEvent = function(event) {
      // Check if it's a CustomEvent
      if (event instanceof CustomEvent) {
        const eventRecord = {
          id: ++eventId,
          name: event.type,
          ts: Date.now(),
          detail: safeStringify(event.detail),
          target: getElementSelector(this)
        };
        
        // Send to content script via postMessage
        window.postMessage({
          type: 'EVENT_WATCHER_EVENT',
          data: eventRecord
        }, '*');
      }
      
      // Call original dispatchEvent
      return originalDispatchEvent.call(this, event);
    };
    
    console.log('[Event Watcher] Event monitoring active');
  })();
`;

// Inject the script into the page
(document.head || document.documentElement).appendChild(script);
script.remove();

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
