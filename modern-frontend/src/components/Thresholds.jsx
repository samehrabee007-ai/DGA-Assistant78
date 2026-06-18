import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, AlertCircle } from 'lucide-react';

export default function Thresholds() {
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);

  const defaultThresholds = [
    { gas: "H2", lo90: 80, lo95: 200, hi90: 40, hi95: 90 },
    { gas: "CH4", lo90: 90, lo95: 150, hi90: 20, hi95: 30 },
    { gas: "C2H6", lo90: 30, lo95: 100, hi90: 15, hi95: 100 },
    { gas: "C2H4", lo90: 90, lo95: 175, hi90: 30, hi95: 40 },
    { gas: "C2H2", lo90: 1, lo95: 2, hi90: 2, hi95: 7 },
    { gas: "CO", lo90: 900, lo95: 1100, hi90: 500, hi95: 600 },
    { gas: "CO2", lo90: 9000, lo95: 12500, hi90: 5000, hi95: 7000 }
  ];

  useEffect(() => {
    axios.get('http://localhost:3001/api/thresholds').then(res => {
      if (res.data.length > 0) {
        setThresholds(res.data);
      } else {
        setThresholds(defaultThresholds);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (index, field, value) => {
    const newThr = [...thresholds];
    newThr[index][field] = parseFloat(value) || 0;
    setThresholds(newThr);
  };

  const handleSave = async () => {
    try {
      await axios.post('http://localhost:3001/api/thresholds/bulk', { thresholds });
      alert('Thresholds saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save thresholds.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">DGA Thresholds</h1>
        <button onClick={handleSave} className="btn-primary">
          <Save size={18} /> Save Settings
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="mt-0.5" size={20} />
        <div>
          <p className="font-semibold">Unknown Age Transformer Thresholds</p>
          <p className="text-sm mt-1">Configure the 90th and 95th percentile limits for different gases based on the O2/N2 ratio.</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 font-semibold text-slate-600">Gas</th>
              <th className="p-4 font-semibold text-slate-600">90th (O2/N2 &le; 0.2)</th>
              <th className="p-4 font-semibold text-slate-600">95th (O2/N2 &le; 0.2)</th>
              <th className="p-4 font-semibold text-slate-600">90th (O2/N2 &gt; 0.2)</th>
              <th className="p-4 font-semibold text-slate-600">95th (O2/N2 &gt; 0.2)</th>
            </tr>
          </thead>
          <tbody>
            {thresholds.map((thr, idx) => (
              <tr key={thr.gas} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-4 font-bold text-primary">{thr.gas}</td>
                <td className="p-4"><input type="number" className="input-field w-24" value={thr.lo90} onChange={(e) => handleChange(idx, 'lo90', e.target.value)} /></td>
                <td className="p-4"><input type="number" className="input-field w-24" value={thr.lo95} onChange={(e) => handleChange(idx, 'lo95', e.target.value)} /></td>
                <td className="p-4"><input type="number" className="input-field w-24" value={thr.hi90} onChange={(e) => handleChange(idx, 'hi90', e.target.value)} /></td>
                <td className="p-4"><input type="number" className="input-field w-24" value={thr.hi95} onChange={(e) => handleChange(idx, 'hi95', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
