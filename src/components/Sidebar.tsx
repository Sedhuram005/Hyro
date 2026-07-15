import {
  LayoutDashboard,
  Users,
  PlusCircle,
  History,
  Stethoscope,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { Page, NavigateFn } from '../lib/types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: NavigateFn;
  collapsed: boolean;
  onToggle: () => void;
}

const navItems: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'hcps', label: 'Healthcare Professionals', icon: Users },
  { id: 'log-interaction', label: 'Log Interaction', icon: PlusCircle },
  { id: 'interactions', label: 'Interaction History', icon: History },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-emerald-100 flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center h-16 border-b border-emerald-100 ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">PharmaRep CRM</p>
            <p className="text-xs text-emerald-600 truncate">AI-First Platform</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="ml-auto p-1 rounded hover:bg-emerald-50 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Toggle when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center h-10 hover:bg-emerald-50 transition-colors border-b border-emerald-100"
        >
          <Menu className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4 text-emerald-200" />}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              MR
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">Medical Rep</p>
              <p className="text-xs text-slate-400 truncate">Field Sales</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
