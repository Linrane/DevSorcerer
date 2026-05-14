import { useQuery } from '@tanstack/react-query';
import { getStatus } from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Circle, Menu, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../../i18n';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useT();
  const [liveEvents, setLiveEvents] = useState(0);
  const { isConnected } = useWebSocket();

  const { data: status, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: getStatus,
    refetchInterval: isConnected ? false : 15_000,
  });

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      // Reset counter every 10s for the "live" indicator
    }, 10000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const isRunning = status?.status === 'running';

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-400 hover:text-gray-200"
          aria-label={t('Open sidebar')}
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <Circle
            size={10}
            className={`${isConnected ? 'text-green-400 fill-green-400' : 'text-gray-600 fill-gray-600'} ${isConnected && liveEvents > 0 ? 'live-dot' : ''}`}
          />
          <span className="text-sm text-gray-400 hidden sm:inline">
            {isConnected ? t('Live') : isRunning ? t('Running') : isLoading ? t('Checking...') : t('Stopped')}
          </span>
        </div>
        {status && (
          <>
            <span className="text-gray-700 hidden sm:inline">|</span>
            <span className="text-sm text-gray-500 hidden md:inline">
              {status.database.sessions}{t(' sessions')}
            </span>
            <span className="text-sm text-gray-500 hidden lg:inline">
              {status.database.events.toLocaleString()}{t(' events')}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {status?.dashboard && (
          <span className="text-xs text-gray-600 hidden sm:inline">
            {status.dashboard.connectedClients}{t(' connected')}
          </span>
        )}
        <button
          onClick={() => window.location.reload()}
          className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200"
          title={t('Refresh')}
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
