import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import HCPs from './pages/HCPs';
import LogInteraction from './pages/LogInteraction';
import Interactions from './pages/Interactions';
import { Page, EditTarget } from './lib/types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const sidebarWidth = sidebarCollapsed ? 64 : 256;

  function navigate(page: Page, edit?: EditTarget) {
    setCurrentPage(page);
    if (edit) {
      setEditTarget(edit);
    } else if (page !== 'log-interaction') {
      setEditTarget(null);
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(p) => navigate(p)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main content */}
      <main
        className="flex-1 min-h-screen overflow-y-auto transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {currentPage === 'hcps' && <HCPs onNavigate={navigate} />}
        {currentPage === 'log-interaction' && <LogInteraction onNavigate={navigate} editTarget={editTarget} />}
        {currentPage === 'interactions' && <Interactions onNavigate={navigate} />}
      </main>
    </div>
  );
}
