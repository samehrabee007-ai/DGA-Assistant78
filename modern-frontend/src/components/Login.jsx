import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === '123456') {
      onLogin('guest');
    } else if (password === '246810') {
      onLogin('admin');
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="Company Logo" className="w-32 h-32 object-contain mb-4 drop-shadow-md rounded-full bg-white" />
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-3">DGA Assistant</h1>
          <div className="text-center font-bold leading-tight flex flex-col gap-1" dir="rtl">
            <span className="text-slate-700 text-lg">منطقة كهرباء مصر الوسطى</span>
            <span className="text-primary text-xl">الإدارة العامة للشئون الفنية</span>
          </div>
          <p className="text-slate-500 text-sm mt-6 text-center">Please enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
            {error && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><ShieldAlert size={14}/> {error}</p>}
          </div>
          <button type="submit" className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
