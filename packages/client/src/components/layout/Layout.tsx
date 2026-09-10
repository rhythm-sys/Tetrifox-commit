import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, Upload, History, BarChart3, Menu, X } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Route Parcel', icon: Package },
  { path: '/batch', label: 'Batch Upload', icon: Upload },
  { path: '/history', label: 'History', icon: History },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Package className="text-primary-600" size={24} />
          <h1 className="text-lg font-semibold text-gray-900">Parcel Routing System</h1>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-col py-4">
          <Nav currentPath={location.pathname} />
        </aside>

        {/* Sidebar - mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-[53px] bottom-0 w-56 bg-white border-r border-gray-200 py-4">
              <Nav currentPath={location.pathname} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}

function Nav({ currentPath, onNavigate }: { currentPath: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1 px-3">
      {navItems.map(({ path, label, icon: Icon }) => {
        const active = currentPath === path;
        return (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
