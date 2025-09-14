import { resolve } from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
import { makeEntryPointPlugin } from '@extension/hmr';
import { getContentScriptEntries, withPageConfig } from '@extension/vite-config';
import { IS_DEV } from '@extension/env';
import { build } from 'vite';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');
const matchesDir = resolve(srcDir, 'matches');

const configs = Object.entries(getContentScriptEntries(matchesDir)).map(([name, entry]) =>
  withPageConfig({
    mode: IS_DEV ? 'development' : undefined,
    resolve: {
      alias: {
        '@src': srcDir,
      },
    },
    publicDir: resolve(rootDir, 'public'),
    plugins: [IS_DEV && makeEntryPointPlugin()],
    build: {
      lib: {
        name: name,
        formats: ['iife'],
        entry,
        fileName: name,
      },
      outDir: resolve(rootDir, '..', '..', 'dist', 'content'),
    },
  }),
);

const builds = configs.map(async config => {
  //@ts-expect-error This is hidden property into vite's resolveConfig()
  config.configFile = false;
  await build(config);
});

await Promise.all(builds);

// Copy event-monitor.js to dist directory
const eventMonitorSrc = resolve(matchesDir, 'all', 'event-monitor.js');
const eventMonitorDest = resolve(rootDir, '..', '..', 'dist', 'event-monitor.js');

try {
  await mkdir(resolve(rootDir, '..', '..', 'dist'), { recursive: true });
  await copyFile(eventMonitorSrc, eventMonitorDest);
  console.log('Copied event-monitor.js to dist directory');
} catch (error) {
  console.error('Failed to copy event-monitor.js:', error);
}
