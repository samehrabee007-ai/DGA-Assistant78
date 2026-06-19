import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, FileText, Settings, Database, Server, LogOut, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PdfUpload from './components/PdfUpload';
import TransformerTracker from './pages/TransformerTracker';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import Thresholds from './components/Thresholds';
import Login from './components/Login';

function Sidebar({ userRole, onLogout, isOpen, setIsOpen }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const links = [
    { name: 'Dashboard', path: '/', icon: <Database size={20} /> },
    ...(userRole === 'admin' ? [{ name: 'Import PDF', path: '/upload', icon: <FileText size={20} /> }] : []),
    { name: 'Executive Dashboard', path: '/executive-dashboard', icon: <Activity size={20} /> },
    { name: 'Tracker', path: '/tracker', icon: <Server size={20} /> },
    ...(userRole === 'admin' ? [{ name: 'Thresholds', path: '/thresholds', icon: <Settings size={20} /> }] : []),
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={`w-64 bg-primary text-white h-screen flex flex-col shadow-2xl fixed left-0 top-0 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="text-secondary" size={28} />
            <h1 className="font-bold text-xl tracking-wide">DGA Assistant</h1>
          </div>
          <button className="md:hidden text-white hover:text-slate-300" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive(link.path)
                  ? 'bg-secondary/20 text-secondary font-semibold border border-secondary/30 shadow-inner'
                  : 'hover:bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-4 shrink-0">
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 font-semibold"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
          <div className="text-xs text-center text-slate-400">
            v2.0 Modern Edition
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const [user, setUser] = useState(() => localStorage.getItem('auth_user') || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogin = (role) => {
    localStorage.setItem('auth_user', role);
    setUser(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex bg-background min-h-screen font-sans overflow-hidden">
        <Sidebar userRole={user} onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        <div className="flex-1 flex flex-col h-screen w-full md:ml-64 transition-all duration-300 overflow-hidden relative">
          {/* Mobile Header */}
          <div className="md:hidden bg-primary text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="text-secondary" size={24} />
              <h1 className="font-bold text-lg">DGA Assistant</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-1 hover:bg-white/10 rounded">
              <Menu size={24} />
            </button>
          </div>

          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full relative">
            <Routes>
              <Route path="/" element={<Dashboard userRole={user} />} />
              <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
              <Route path="/tracker" element={<TransformerTracker />} />
              {user === 'admin' && (
                <>
                  <Route path="/upload" element={<PdfUpload userRole={user} />} />
                  <Route path="/thresholds" element={<Thresholds />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
