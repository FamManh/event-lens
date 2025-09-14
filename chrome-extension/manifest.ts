import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  name: 'Event Watcher',
  version: packageJson.version,
  description: 'Chrome DevTools extension for monitoring CustomEvent dispatches',
  host_permissions: ['<all_urls>'],
  permissions: ['storage', 'scripting'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  icons: {
    '128': 'icon-128.png',
    '34': 'icon-34.png',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content/all.iife.js'],
      run_at: 'document_start',
    },
  ],
  devtools_page: 'devtools/index.html',
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'event-monitor.js'],
      matches: ['*://*/*'],
    },
  ],
} satisfies ManifestType;

export default manifest;
