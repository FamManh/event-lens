# Event Watcher Development Plan

This document outlines the plan to refactor the boilerplate project and build the Event Watcher Chrome extension.

## Part 1: Project Cleanup

The existing boilerplate is a comprehensive template for various extension types. We will remove components that are not required for a DevTools extension to simplify the codebase.

### Directories and Packages to Remove

- [x] `pages/new-tab`: Not needed for the DevTools panel.
- [x] `pages/options`: The "Console Mirroring" toggle will be implemented directly in the DevTools UI for a better user experience.
- [x] `pages/popup`: The primary interface is the DevTools panel, not a browser action popup.
- [x] `pages/side-panel`: Not required by the extension.
- [x] `pages/content-runtime`: Not required by the extension.
- [x] `pages/content-ui`: The extension does not inject any UI into the page itself.
- [x] `packages/i18n`: Internationalization is not a current requirement.
- [x] `tests/`: All testing-related directories (`tests/e2e`) can be removed as per the request.

### Cleanup Tasks

1.  [x] Delete the directories listed above.
2.  [x] Update `pnpm-workspace.yaml` to remove the deleted pages and packages from the workspace definition.
3.  [x] Go through the `package.json` file in the root directory and in `chrome-extension` to remove any scripts or dependencies related to the deleted packages.
4.  [x] Run `pnpm install` to update the lock file and remove orphaned dependencies.

## Part 2: Development Plan

This is a step-by-step guide to implement the Event Watcher extension.

### Task 1: Setup Manifest and Project Configuration

- [x] **Modify `chrome-extension/manifest.ts`**:
    - [x] Set the extension `name` to "Event Watcher" and update the `description`.
    - [x] Define the `devtools_page` pointing to `pages/devtools/index.html`.
    - [x] Ensure the `background` service worker script is correctly registered.
    - [x] Configure the `content_scripts` to inject a script at `document_start` on all pages (`<all_urls>`).
    - [x] Add `scripting` and `storage` to the `permissions` array.

### Task 2: Event Injection and Capturing (Page Context)

- [x] **Create an injection script**: This script will be injected into the main world (page context) by the content script.
- [x] **Monkey-patch `EventTarget.prototype.dispatchEvent`**:
    - [x] Store the original `dispatchEvent` function.
    - [x] Create a wrapper function that checks if `event` is an instance of `CustomEvent`.
    - [x] If it is a `CustomEvent`, construct the event record object (`{ id, name, ts, detail, target }`).
    - [x] Safely serialize the `detail` object, handling potential circular references and removing non-serializable data.
    - [x] Use `window.postMessage` to send the record to the content script.
    - [x] Call the original `dispatchEvent` function to ensure normal page operation.

### Task 3: Content Script Relay

- [x] **Update the content script (`pages/content/src/index.ts`)**:
    - [x] Implement the logic to inject the script from Task 2 into the page's main world.
    - [x] Add a `window.addEventListener('message', ...)` to listen for messages from the injected script.
    - [x] Upon receiving a message, verify it's from our script and use `chrome.runtime.sendMessage` to forward the event record to the background service worker.

### Task 4: Background Service Worker

- [x] **Implement logic in `chrome-extension/src/background/index.ts`**:
    - [x] Implement a ring buffer to store the last 2,000 events.
    - [x] Create a listener for `chrome.runtime.onMessage` to receive event records from the content script and add them to the buffer.
    - [x] Set up a `chrome.runtime.onConnect` listener for connections from the DevTools panel.
    - [x] When a DevTools panel connects, send it the existing events from the buffer and then stream any new events as they arrive.

### Task 5: DevTools Panel UI & Logic

- [x] **Setup DevTools page**:
    - [x] The `pages/devtools/src/index.ts` script will use `chrome.devtools.panels.create` to create a new panel named "Event Watcher".
- [x] **Build the panel UI (`pages/devtools-panel/src/Panel.tsx`)**:
    - [x] Use a UI library (the boilerplate seems to use React) to create the interface.
    - [x] Add a component to display the list of events.
    - [x] Implement the toolbar with:
        - [x] Search input field.
        - [x] Prefix filter input field.
        - [x] "Pause/Resume" button.
        - [x] "Clear" button.
        - [x] "Mirror to Console" toggle switch.
        - [x] "Export" button for downloading events as JSON.
        - [x] Event count display (Total/Filtered).
- [x] **Implement the panel logic**:
    - [x] On initialization, establish a long-lived connection to the background service worker using `chrome.runtime.connect`.
    - [x] Listen for messages from the background script and update the UI with new events.
    - [x] Implement the client-side logic for filtering (Search, Prefix).
    - [x] Wire up the "Pause/Resume", "Clear", and "Copy JSON" functionalities.
    - [x] Implement the "Mirror to Console" logic, which will use `chrome.devtools.inspectedWindow.eval` to `console.log` the event data in the inspected window's console.
    - [x] Add performance optimizations with virtual scrolling for large event lists.
    - [x] Add "Show More" functionality for better performance with many events.

## Additional Features Implemented

- [x] **Test Page**: Created `test-events.html` with comprehensive test cases for various event types.
- [x] **Performance Optimizations**: Event count display, virtual scrolling, and "Show More" functionality.
- [x] **Export Functionality**: Download captured events as JSON file with metadata.
- [x] **Enhanced UI**: Better styling, hover effects, and responsive design.
- [x] **CSP Compliance**: Fixed Content Security Policy issues by removing inline script injection and using direct content script event monitoring.

## Troubleshooting Completed

- [x] **CSP Error Fix**: Resolved "Refused to execute inline script" error by removing inline script injection and implementing CSP-compliant event monitoring directly in the content script context.
- [x] **Production Build**: Ensured proper production build without development HMR code that was causing event capture issues.
- [x] **Main World Injection**: Fixed event capture by properly injecting the event monitoring script into the page's main world using script injection, allowing it to intercept CustomEvents dispatched by the page.
- [x] **CSP Compliance (Final)**: Resolved CSP issues by creating a separate `event-monitor.js` file and loading it as an external script instead of inline content, making it fully CSP-compliant.
- [x] **Enhanced Event Filtering**: Added checkbox to toggle between showing only CustomEvents (default) or all events, with visual indicators for event types.
- [x] **Improved JSON Display**: Enhanced payload display with proper JSON formatting and parsing for better readability.
- [x] **Newest-First Display**: Changed event display order to show newest events at the top instead of bottom for better user experience.
- [x] **Build Order Fix**: Resolved missing `content/all.iife.js` file by ensuring proper build order - content scripts build before chrome extension to prevent file overwrites.
- [x] **Mirror Console Bug Fix**: Fixed issue where toggling "Mirror events to Console" checkbox would re-show cleared events by properly tracking mirrored event IDs and preventing re-mirroring of old events.
