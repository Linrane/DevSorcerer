import { useQuery } from '@tanstack/react-query';
import { getStatus } from '../../api/client';
import { Circle, RefreshCw } from 'lucide-react';

export function Header() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: getStatus,
    refetchInterval: 15_000,
  });

  const isRunning = status?.status === 'running';

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Circle
            size={10}
            className={isRunning ? 'text-green-400 fill-green-400' : 'text-gray-600 fill-gray-600'}
          />
          <span className="text-sm text-gray-400">
            {isRunning ? 'Collector running' : isLoading ? 'Checking...' : 'Stopped'}
          </span>
        </div>
        {status && (
          <>
            <span className="text-gray-700">|</span>
            <span className="text-sm text-gray-500">
              {status.database.sessions} sessions
            </span>
            <span className="text-sm text-gray-500">
              {status.database.events.toLocaleString()} events
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {status?.dashboard && (
          <span className="text-xs text-gray-600">
            {status.dashboard.connectedClients} connected
          </span>
        )}
        <button
          onClick={() => window.location.reload()}
          className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
