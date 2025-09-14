import '@src/Panel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect, useRef } from 'react';

interface EventRecord {
  id: number;
  name: string;
  ts: number;
  detail: string;
  target: string;
  timestamp?: number;
}

const Panel = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [prefixFilter, setPrefixFilter] = useState('');
  const [mirrorToConsole, setMirrorToConsole] = useState(false);
  const [, setPort] = useState<chrome.runtime.Port | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Connect to background script
  useEffect(() => {
    const newPort = chrome.runtime.connect({ name: 'event-watcher-devtools' });
    setPort(newPort);

    newPort.onMessage.addListener(message => {
      if (message.type === 'EVENT_WATCHER_INIT') {
        setEvents(message.data);
      } else if (message.type === 'EVENT_WATCHER_NEW_EVENT' && !isPaused) {
        setEvents(prev => [...prev, message.data]);

        // Mirror to console if enabled
        if (mirrorToConsole) {
          chrome.devtools.inspectedWindow.eval(`
            console.log('[Event Watcher]', ${JSON.stringify(message.data)});
          `);
        }
      }
    });

    return () => {
      newPort.disconnect();
    };
  }, [isPaused, mirrorToConsole]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Filter events based on search and prefix
  const filteredEvents = events.filter(event => {
    const matchesSearch =
      !searchTerm ||
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.target.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPrefix = !prefixFilter || event.name.startsWith(prefixFilter);

    return matchesSearch && matchesPrefix;
  });

  const clearEvents = () => {
    setEvents([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  return (
    <div className="event-watcher-panel bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Event Watcher</h1>
          <div className="flex items-center space-x-2">
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

        {/* Mirror to Console Toggle */}
        <div className="mt-3 flex items-center">
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
      </div>

      {/* Events List */}
      <div className="event-list flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {events.length === 0 ? 'No events captured yet' : 'No events match the current filters'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEvents.map(event => (
              <div key={event.id} className="event-item p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="event-badge bg-blue-100 text-blue-800">{event.name}</span>
                      <span className="text-sm text-gray-500">{event.target}</span>
                      <span className="text-sm text-gray-400">{formatTime(event.ts)}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <details className="cursor-pointer">
                        <summary className="font-medium">Payload</summary>
                        <pre className="event-payload mt-2 rounded bg-gray-100 p-2">{event.detail}</pre>
                      </details>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(event.detail)}
                    className="ml-2 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Copy JSON to clipboard">
                    Copy
                  </button>
                </div>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Panel, <LoadingSpinner />), ErrorDisplay);
