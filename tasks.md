# Event Watcher Development Plan

This document outlines the plan to refactor the boilerplate project and build the Event Watcher Chrome extension.

## Part 1: Project Cleanup

The existing boilerplate is a comprehensive template for various extension types. We will remove components that are not required for a DevTools extension to simplify the codebase.

### Directories and Packages to Remove

- [ ] `pages/new-tab`: Not needed for the DevTools panel.
- [ ] `pages/options`: The "Console Mirroring" toggle will be implemented directly in the DevTools UI for a better user experience.
- [ ] `pages/popup`: The primary interface is the DevTools panel, not a browser action popup.
- [ ] `pages/side-panel`: Not required by the extension.
- [ ] `pages/content-runtime`: Not required by the extension.
- [ ] `pages/content-ui`: The extension does not inject any UI into the page itself.
- [ ] `packages/i18n`: Internationalization is not a current requirement.
- [ ] `tests/`: All testing-related directories (`tests/e2e`) can be removed as per the request.

### Cleanup Tasks

1.  [ ] Delete the directories listed above.
2.  [ ] Update `pnpm-workspace.yaml` to remove the deleted pages and packages from the workspace definition.
3.  [ ] Go through the `package.json` file in the root directory and in `chrome-extension` to remove any scripts or dependencies related to the deleted packages.
4.  [ ] Run `pnpm install` to update the lock file and remove orphaned dependencies.

## Part 2: Development Plan

This is a step-by-step guide to implement the Event Watcher extension.

### Task 1: Setup Manifest and Project Configuration

- [ ] **Modify `chrome-extension/manifest.ts`**:
    - [ ] Set the extension `name` to "Event Watcher" and update the `description`.
    - [ ] Define the `devtools_page` pointing to `pages/devtools/index.html`.
    - [ ] Ensure the `background` service worker script is correctly registered.
    - [ ] Configure the `content_scripts` to inject a script at `document_start` on all pages (`<all_urls>`).
    - [ ] Add `scripting` and `storage` to the `permissions` array.

### Task 2: Event Injection and Capturing (Page Context)

- [ ] **Create an injection script**: This script will be injected into the main world (page context) by the content script.
- [ ] **Monkey-patch `EventTarget.prototype.dispatchEvent`**:
    - [ ] Store the original `dispatchEvent` function.
    - [ ] Create a wrapper function that checks if `event` is an instance of `CustomEvent`.
    - [ ] If it is a `CustomEvent`, construct the event record object (`{ id, name, ts, detail, target }`).
    - [ ] Safely serialize the `detail` object, handling potential circular references and removing non-serializable data.
    - [ ] Use `window.postMessage` to send the record to the content script.
    - [ ] Call the original `dispatchEvent` function to ensure normal page operation.

### Task 3: Content Script Relay

- [ ] **Update the content script (`pages/content/src/index.ts`)**:
    - [ ] Implement the logic to inject the script from Task 2 into the page's main world.
    - [ ] Add a `window.addEventListener('message', ...)` to listen for messages from the injected script.
    - [ ] Upon receiving a message, verify it's from our script and use `chrome.runtime.sendMessage` to forward the event record to the background service worker.

### Task 4: Background Service Worker

- [ ] **Implement logic in `chrome-extension/src/background/index.ts`**:
    - [ ] Implement a ring buffer to store the last 2,000 events.
    - [ ] Create a listener for `chrome.runtime.onMessage` to receive event records from the content script and add them to the buffer.
    - [ ] Set up a `chrome.runtime.onConnect` listener for connections from the DevTools panel.
    - [ ] When a DevTools panel connects, send it the existing events from the buffer and then stream any new events as they arrive.

### Task 5: DevTools Panel UI & Logic

- [ ] **Setup DevTools page**:
    - [ ] The `pages/devtools/src/index.ts` script will use `chrome.devtools.panels.create` to create a new panel named "Event Watcher".
- [ ] **Build the panel UI (`pages/devtools-panel/src/App.tsx`)**:
    - [ ] Use a UI library (the boilerplate seems to use React) to create the interface.
    - [ ] Add a component to display the list of events.
    - [ ] Implement the toolbar with:
        - [ ] Search input field.
        - [ ] Prefix filter input field.
        - [ ] "Pause/Resume" button.
        - [ ] "Clear" button.
        - [ ] "Mirror to Console" toggle switch.
- [ ] **Implement the panel logic**:
    - [ ] On initialization, establish a long-lived connection to the background service worker using `chrome.runtime.connect`.
    - [ ] Listen for messages from the background script and update the UI with new events.
    - [ ] Implement the client-side logic for filtering (Search, Prefix).
    - [ ] Wire up the "Pause/Resume", "Clear", and "Copy JSON" functionalities.
    - [ ] Implement the "Mirror to Console" logic, which will use `chrome.devtools.inspectedWindow.eval` to `console.log` the event data in the inspected window's console.
