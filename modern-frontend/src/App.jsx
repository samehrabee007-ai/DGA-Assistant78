import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, FileText, Settings, Database, Server, List } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PdfUpload from './components/PdfUpload';
import TransformerTracker from './pages/TransformerTracker';
import Thresholds from './components/Thresholds';

function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const links = [
    { name: 'Dashboard', path: '/', icon: <Database size={20} /> },
    { name: 'Import PDF', path: '/upload', icon: <FileText size={20} /> },
    { name: 'Tracker', path: '/tracker', icon: <Server size={20} /> },
    { name: 'Thresholds', path: '/thresholds', icon: <Settings size={20} /> },
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
      <div className="p-4 text-xs text-center text-slate-400 border-t border-white/10">
        v2.0 Modern Edition
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="flex bg-background min-h-screen font-sans">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<PdfUpload />} />
            <Route path="/tracker" element={<TransformerTracker />} />
            <Route path="/thresholds" element={<Thresholds />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
