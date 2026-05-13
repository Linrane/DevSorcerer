import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTree,
  DollarSign,
  Shield,
  TrendingUp,
  Search,
  FileText,
  Settings,
} from 'lucide-react';

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

export function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-purple-400 flex items-center gap-2">
          <span>DevSorcerer</span>
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        v0.1.0
      </div>
    </aside>
  );
}
