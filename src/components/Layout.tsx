import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col">
        <TopNav onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="lg:ml-64 p-4 md:p-10 min-h-[calc(100vh-72px)] transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
