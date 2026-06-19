import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function TransformerTracker() {
  const [transformers, setTransformers] = useState([]);
  const [selectedSubstation, setSelectedSubstation] = useState('');
  const [selectedTransformer, setSelectedTransformer] = useState('');
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransformers();
  }, []);

  useEffect(() => {
    if (selectedSubstation && selectedTransformer) {
      fetchHistory();
    }
  }, [selectedSubstation, selectedTransformer]);

  const fetchTransformers = async () => {
    try {
      const res = await axios.get('https://dga-backend-4d39.onrender.com/api/transformers/list');
      setTransformers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`https://dga-backend-4d39.onrender.com/api/transformers/history?substation=${encodeURIComponent(selectedSubstation)}&transformer=${encodeURIComponent(selectedTransformer)}`);
      
      // Format dates and deduplicate by chartDate
      const uniqueData = [];
      const seenDates = new Set();
      
      res.data.forEach(item => {
        let chartDateStr = 'Unknown';
        if (item.sampleDate) {
          const d = new Date(item.sampleDate);
          chartDateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        }
        
        if (!seenDates.has(chartDateStr)) {
          seenDates.add(chartDateStr);
          uniqueData.push({
            ...item,
            chartDate: chartDateStr,
            o2_n2_ratio: item.o2_n2_ratio || (item.o2 && item.n2 ? parseFloat((item.o2 / item.n2).toFixed(2)) : 0)
          });
        }
      });
      setHistory(uniqueData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const substations = [...new Set(transformers.map(t => t.substation))];
  const availableTransformers = transformers.filter(t => t.substation === selectedSubstation).map(t => t.transformer);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Transformer Tracking</h1>
      </div>

      <div className="glass-panel p-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Substation</label>
          <select 
            value={selectedSubstation}
            onChange={(e) => { setSelectedSubstation(e.target.value); setSelectedTransformer(''); setHistory([]); }}
            className="input-field"
          >
            <option value="">Select Substation</option>
            {substations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Transformer</label>
          <select 
            value={selectedTransformer}
            onChange={(e) => setSelectedTransformer(e.target.value)}
            disabled={!selectedSubstation}
            className="input-field"
          >
            <option value="">Select Transformer</option>
            {availableTransformers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {!selectedTransformer && (
        <div className="glass-panel p-12 text-center text-slate-500">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a substation and transformer to view its history</p>
        </div>
      )}

      {loading && <p className="text-center text-primary mt-8">Loading history...</p>}

      {selectedTransformer && !loading && history.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-6 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <Activity size={24}/>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Samples</p>
                <p className="text-2xl font-bold text-slate-800">{history.length}</p>
              </div>
            </div>
            <div className="glass-panel p-6 flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                <Clock size={24}/>
              </div>
              <div>
                <p className="text-sm text-slate-500">Latest Sample Date</p>
                <p className="text-xl font-bold text-slate-800">
                  {history[history.length - 1].chartDate}
                </p>
              </div>
            </div>
            <div className="glass-panel p-6 flex items-center gap-4">
              <div className={`${history[history.length - 1].dga === 'Normal' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} p-3 rounded-full`}>
                {history[history.length - 1].dga === 'Normal' ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>}
              </div>
              <div>
                <p className="text-sm text-slate-500">Latest Status</p>
                <p className="text-xl font-bold text-slate-800">{history[history.length - 1].dga || 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* O2/N2 Ratio Chart */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">O2/N2 Ratio Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="chartDate" />
                    <YAxis />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <ReferenceLine y={0.2} stroke="red" strokeDasharray="3 3" label="Threshold" />
                    <Line type="monotone" dataKey="o2_n2_ratio" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="O2 / N2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Main Fault Gases Chart */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Fault Gases Trend (ppm)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="chartDate" />
                    <YAxis />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="h2" stroke="#ef4444" strokeWidth={2} name="H2" />
                    <Line type="monotone" dataKey="ch4" stroke="#f59e0b" strokeWidth={2} name="CH4" />
                    <Line type="monotone" dataKey="c2h4" stroke="#8b5cf6" strokeWidth={2} name="C2H4" />
                    <Line type="monotone" dataKey="c2h2" stroke="#10b981" strokeWidth={2} name="C2H2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Historical Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-sm">
                    <th className="py-3 px-2 font-semibold text-slate-600">Sample Date</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">CO</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">CH4</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">C2H2</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">C2H6</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">C2H4</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">CO2</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">H2</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">O2/N2</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">N2</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">O2</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">DGA Status</th>
                    <th className="py-3 px-2 font-semibold text-slate-600">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
                      <td className="py-2 px-2 whitespace-nowrap">{row.chartDate}</td>
                      <td className="py-2 px-2 font-mono">{row.co ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.ch4 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.c2h2 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.c2h6 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.c2h4 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.co2 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.h2 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.o2_n2_ratio ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.n2 ?? '-'}</td>
                      <td className="py-2 px-2 font-mono">{row.o2 ?? '-'}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${row.dga === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.dga || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">{row.recommended || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {selectedTransformer && !loading && history.length === 0 && (
        <div className="glass-panel p-8 text-center text-slate-500">
          <p>No historical data found for this transformer.</p>
        </div>
      )}
    </div>
  );
}
