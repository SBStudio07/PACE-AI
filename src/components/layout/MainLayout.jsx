import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, CalendarDays, ChevronsLeft, ChevronsRight, Gauge, LayoutDashboard, LifeBuoy, ListChecks, Menu, Settings, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { Badge, cx } from '../ui/index.jsx';
import { fmtDateLong } from '../../utils/dateUtils.js';

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/app/planner', label: 'Weekly Planner', icon: CalendarDays },
  { to: '/app/workload', label: 'Workload Analysis', icon: BarChart3 },
  { to: '/app/recovery', label: 'AI Recovery Assistant', icon: LifeBuoy },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export const Logo = ({ light }) => (
  <div className="flex items-center gap-2">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><Gauge className="h-4 w-4" aria-hidden /></span>
    <span className={cx('text-base font-bold tracking-tight', light ? 'text-white' : 'text-slate-900')}>PACE AI</span>
  </div>
);

function SidebarBody({ collapsed, onNavigate }) {
  const { state, missed } = useApp();
  const initials = state.profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <div className="flex h-full flex-col">
      <div className={cx('flex h-16 items-center border-b border-slate-100 px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><Gauge className="h-4 w-4" aria-hidden /></span> : <Logo />}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined}
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              collapsed && 'justify-center px-2')}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && to === '/app/recovery' && missed.length > 0 && <Badge tone="red" className="ml-auto">{missed.length}</Badge>}
          </NavLink>
        ))}
      </nav>
      <div className={cx('border-t border-slate-100 p-3', collapsed && 'flex justify-center')}>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{initials}</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{state.profile.name}</p>
              <p className="truncate text-xs text-slate-500">Semester {state.profile.semester}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { state } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  return (
    <div className="flex h-full">
      <aside className={cx('hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-64')}>
        <SidebarBody collapsed={collapsed} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            <SidebarBody onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
          <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:block">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
          <p className="text-sm font-medium text-slate-900">{current?.label}</p>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">Demo date: {fmtDateLong(state.demoDate)}</span>
            <Badge tone="violet">Demo mode</Badge>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
