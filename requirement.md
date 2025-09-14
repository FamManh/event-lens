# Event Watcher - Chrome DevTools Extension Requirements

## 1. Core Functionality

Create a Chrome Manifest V3 DevTools extension named **Event Watcher**. Its primary purpose is to record all `CustomEvent` dispatches on the inspected page without requiring any modification to the page's source code.

## 2. Technical Implementation

### 2.1. Event Injection and Capturing
- **Injection Point**: The content script must be injected at `document_start`.
- **Patching Strategy**: It should monkey-patch `EventTarget.prototype.dispatchEvent` within the page's main world (isolated from the content script's context).
- **Event Handling**:
    - On each `dispatchEvent` call, check if the event is an instance of `CustomEvent`.
    - If it is, build a compact, serializable record with the following structure:
      ```json
      {
        "id": "unique-event-id",
        "name": "event.type",
        "ts": "timestamp",
        "detail": "JSON.stringified version of event.detail",
        "target": "A selector or identifier for the event target"
      }
      ```
    - **Safety**: The `detail` property must be safely stringified, handling circular references and excluding non-serializable objects like DOM nodes or Blobs. The main thread must never be blocked.

### 2.2. Communication Flow
1.  **Page to Content Script**: The patched `dispatchEvent` function will use `window.postMessage` to send the event record to the window.
2.  **Content Script to Background**: A content script will listen for these messages and relay them to the background service worker using `chrome.runtime.sendMessage`.
3.  **Background to DevTools**: The background service worker will stream the events to the DevTools panel.

### 2.3. Background Service Worker
- **Data Storage**: Maintain a ring buffer that stores the most recent 2,000 event records. This prevents unbounded memory growth.
- **DevTools Connection**: Manage communication with the DevTools panel, streaming new events as they arrive and sending the buffered events upon initial connection.

## 3. DevTools Panel UI

The extension must create a new panel in DevTools named **Event Watcher**.

### 3.1. Display
- **Event List**: A console-like, auto-scrolling list of captured events.
- **Entry Format**: Each entry should clearly display:
    - **Name**: A badge with the event name (e.g., `form.country-changed`).
    - **Target**: A representation of the event target.
    - **Time**: The timestamp of the event.
    - **Payload**: A collapsible and browsable view of the JSON `detail` payload.

### 3.2. Features
- **Search**: A search bar to filter events by their name or payload content.
- **Prefix Filter**: An input field to filter events by a specific prefix (e.g., `form`, `surcharge.object`).
- **Controls**:
    - **Pause/Resume**: To temporarily stop and restart event recording.
    - **Clear**: To clear all captured events from the panel.
    - **Copy JSON**: A button on each event entry to copy the `detail` payload to the clipboard.
- **Console Mirroring**: An optional toggle switch to mirror the captured event data to the main DevTools Console (`console.log`).