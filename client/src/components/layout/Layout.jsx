import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import clsx from 'clsx';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-coal-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className={clsx(
        'flex flex-col flex-1 min-w-0 transition-all duration-300',
        collapsed ? 'ml-16' : 'ml-64',
      )}>
        <Navbar onMenuToggle={() => setCollapsed(c => !c)} sidebarCollapsed={collapsed} />

        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
