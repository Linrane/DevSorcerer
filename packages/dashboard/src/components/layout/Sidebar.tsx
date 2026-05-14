import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTree,
  DollarSign,
  Shield,
  TrendingUp,
  Search,
  FileText,
  Settings,
  X,
  Eye,
} from 'lucide-react';
import { useT } from '../../i18n';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/sessions', icon: ListTree, label: 'Sessions' },
  { to: '/cost', icon: DollarSign, label: 'Cost' },
  { to: '/risk', icon: Shield, label: 'Risk' },
  { to: '/quality', icon: TrendingUp, label: 'Quality' },
  { to: '/knowledge', icon: Search, label: 'Knowledge' },
  { to: '/audit', icon: FileText, label: 'Audit' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { t } = useT();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-56 bg-gray-900 border-r border-gray-800
          flex flex-col transition-transform duration-200 flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 flex-shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <Eye size={22} className="text-purple-400" />
            <span className="font-semibold text-purple-400 text-sm">DevSorcerer</span>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-300"
            aria-label={t('Close sidebar')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <item.icon size={18} />
                {t(item.label)}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
          <span className="text-xs text-gray-600">DevSorcerer v0.3.2</span>
        </div>
      </aside>
    </>
  );
}
