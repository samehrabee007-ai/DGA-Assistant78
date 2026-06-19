import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, FileText, Settings, Database, Server, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PdfUpload from './components/PdfUpload';
import TransformerTracker from './pages/TransformerTracker';
import Thresholds from './components/Thresholds';
import Login from './components/Login';

function Sidebar({ userRole, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const links = [
    { name: 'Dashboard', path: '/', icon: <Database size={20} /> },
    ...(userRole === 'admin' ? [{ name: 'Import PDF', path: '/upload', icon: <FileText size={20} /> }] : []),
    { name: 'Tracker', path: '/tracker', icon: <Server size={20} /> },
    ...(userRole === 'admin' ? [{ name: 'Thresholds', path: '/thresholds', icon: <Settings size={20} /> }] : []),
  ];

  return (
    <div className="w-64 bg-primary text-white h-screen flex flex-col shadow-2xl fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <Activity className="text-secondary" size={28} />
        <h1 className="font-bold text-xl tracking-wide">DGA Assistant</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
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
      <div className="p-4 border-t border-white/10 space-y-4">
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
  );
}

function App() {
  const [user, setUser] = React.useState(() => localStorage.getItem('auth_user') || null);

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
      <div className="flex bg-background min-h-screen font-sans">
        <Sidebar userRole={user} onLogout={handleLogout} />
        <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tracker" element={<TransformerTracker />} />
            {user === 'admin' && (
              <>
                <Route path="/upload" element={<PdfUpload />} />
                <Route path="/thresholds" element={<Thresholds />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
