import '@src/Panel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect } from 'react';

interface EventRecord {
  id: number;
  name: string;
  ts: number;
  detail: string;
  target: string;
  timestamp?: number;
  isCustomEvent?: boolean;
}

const Panel = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [prefixFilter, setPrefixFilter] = useState('');
  const [mirrorToConsole, setMirrorToConsole] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [, setPort] = useState<chrome.runtime.Port | null>(null);
  const [maxEventsToShow, setMaxEventsToShow] = useState(100);
  const [, setLastMirroredEventId] = useState<number | null>(null);

  // Connect to background script
  useEffect(() => {
    const newPort = chrome.runtime.connect({ name: 'event-watcher-devtools' });
    setPort(newPort);

    newPort.onMessage.addListener(message => {
      console.log('🚀 ~ Panel ~ message:', message);
      if (message.type === 'EVENT_WATCHER_INIT') {
        setEvents(message.data);
        // Reset mirrored event tracking when reconnecting
        setLastMirroredEventId(null);
      } else if (message.type === 'EVENT_WATCHER_NEW_EVENT' && !isPaused) {
        setEvents(prev => [...prev, message.data]);

        // Mirror to console if enabled and this is a new event
        if (mirrorToConsole) {
          chrome.devtools.inspectedWindow.eval(`
            console.log('[Event Watcher]', ${JSON.stringify(message.data)});
          `);
          setLastMirroredEventId(message.data.id);
        }
      }
    });

    return () => {
      newPort.disconnect();
    };
  }, [isPaused, mirrorToConsole]);

  // Auto-scroll to top when new events arrive (since newest are at top)
  useEffect(() => {
    const eventList = document.querySelector('.event-list');
    if (eventList) {
      eventList.scrollTop = 0;
    }
  }, [events]);

  // Filter events based on search, prefix, and event type
  const filteredEvents = events.filter(event => {
    // Filter by event type (CustomEvent only or all events)
    const matchesEventType = showAllEvents || event.isCustomEvent !== false;

    const matchesSearch =
      !searchTerm ||
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.target.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPrefix = !prefixFilter || event.name.startsWith(prefixFilter);

    return matchesEventType && matchesSearch && matchesPrefix;
  });

  // Limit displayed events for performance (show newest first)
  const displayedEvents = filteredEvents.slice(-maxEventsToShow).reverse();

  const clearEvents = () => {
    setEvents([]);
    setLastMirroredEventId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportEvents = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
      events: filteredEvents.map(event => ({
        id: event.id,
        name: event.name,
        timestamp: event.ts,
        target: event.target,
        detail: event.detail,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-watcher-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  const toggleCaptureAllEvents = () => {
    const newValue = !showAllEvents;
    setShowAllEvents(newValue);

    // Send message to content script to toggle capture all events
    chrome.devtools.inspectedWindow.eval(`
      window.eventWatcherCaptureAll = ${newValue};
      console.log('[Event Watcher] Capture all events:', ${newValue});
    `);
  };

  const formatPayload = (detail: string) => {
    try {
      const parsed = JSON.parse(detail);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return detail;
    }
  };

  return (
    <div className="event-watcher-panel bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Event Watcher</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">Total: {events.length}</span>
              {filteredEvents.length !== events.length && (
                <span className="rounded bg-green-100 px-2 py-1 text-green-800">Filtered: {filteredEvents.length}</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportEvents}
              className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 hover:bg-blue-200"
              disabled={events.length === 0}>
              Export
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                isPaused ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={clearEvents}
              className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200">
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Prefix filter (e.g., form.)"
            value={prefixFilter}
            onChange={e => setPrefixFilter(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Toggles */}
        <div className="mt-3 flex items-center space-x-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="mirror-console"
              checked={mirrorToConsole}
              onChange={e => setMirrorToConsole(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="mirror-console" className="text-sm text-gray-700">
              Mirror events to Console
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-all-events"
              checked={showAllEvents}
              onChange={toggleCaptureAllEvents}
              className="mr-2"
            />
            <label htmlFor="show-all-events" className="text-sm text-gray-700">
              Show all events (not just CustomEvents)
            </label>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="event-list flex-1 overflow-y-auto">
        {displayedEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {events.length === 0 ? 'No events captured yet' : 'No events match the current filters'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEvents.length > maxEventsToShow && (
              <div className="bg-yellow-50 p-4 text-center text-sm text-gray-500">
                Showing newest {maxEventsToShow} of {filteredEvents.length} events
                <button
                  onClick={() => setMaxEventsToShow(prev => Math.min(prev + 100, filteredEvents.length))}
                  className="ml-2 text-blue-600 underline hover:text-blue-800">
                  Show More
                </button>
              </div>
            )}
            {displayedEvents.map(event => (
              <div key={event.id} className="event-item p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <span
                        className={`event-badge ${event.isCustomEvent !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {event.name}
                      </span>
                      {event.isCustomEvent !== false && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">CustomEvent</span>
                      )}
                      <span className="text-sm text-gray-500">{event.target}</span>
                      <span className="text-sm text-gray-400">{formatTime(event.ts)}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <details className="cursor-pointer">
                        <summary className="font-medium">Payload</summary>
                        <pre className="event-payload mt-2 rounded bg-gray-100 p-2">{formatPayload(event.detail)}</pre>
                      </details>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(formatPayload(event.detail))}
                    className="ml-2 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Copy JSON to clipboard">
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Panel, <LoadingSpinner />), ErrorDisplay);
