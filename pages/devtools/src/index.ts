try {
  console.log('Event Watcher DevTools extension loaded');
  chrome.devtools.panels.create('Event Watcher', '/icon-34.png', '/devtools-panel/index.html');
} catch (e) {
  console.error('Failed to create Event Watcher panel:', e);
}
