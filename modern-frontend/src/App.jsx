import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, FileText, Settings, Database, Server, List } from 'lucide-react';
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
        <img src="/logo.jpg" alt="Logo" className="w-12 h-12 object-contain drop-shadow-md rounded-full bg-white p-0.5" />
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
      <div className="p-4 flex flex-col gap-2 border-t border-white/10">
        <button onClick={onLogout} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white">Logout</button>
        <div className="text-xs text-center text-slate-400">
          v2.0 Modern Edition
        </div>
      </div>
    </div>
  );
}

function App() {
  const [userRole, setUserRole] = React.useState(null);

  if (!userRole) {
    return <Login onLogin={setUserRole} />;
  }

  return (
    <Router>
      <div className="flex bg-background min-h-screen font-sans">
        <Sidebar userRole={userRole} onLogout={() => setUserRole(null)} />
        <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
          <Routes>
            <Route path="/" element={<Dashboard userRole={userRole} />} />
            {userRole === 'admin' && <Route path="/upload" element={<PdfUpload />} />}
            <Route path="/tracker" element={<TransformerTracker userRole={userRole} />} />
            {userRole === 'admin' && <Route path="/thresholds" element={<Thresholds />} />}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
