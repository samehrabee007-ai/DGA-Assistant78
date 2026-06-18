import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { evaluateIEEE } from '../utils/ieeeStandard';

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
      const res = await axios.get('http://localhost:3001/api/transformers/list');
      setTransformers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/transformers/history?substation=${encodeURIComponent(selectedSubstation)}&transformer=${encodeURIComponent(selectedTransformer)}`);
      
      const formatted = res.data.map(item => {
        const ieee = evaluateIEEE(item);
        return {
          ...item,
          chartDate: item.sampleDate ? new Date(item.sampleDate).toLocaleDateString('en-GB') : 'Unknown',
          o2_n2_ratio: item.o2_n2_ratio || (item.o2 && item.n2 ? parseFloat((item.o2 / item.n2).toFixed(2)) : 0),
          ieeeCondition: ieee.condition,
          ieeeMeta: ieee.meta,
          exceededGases: ieee.exceededGases,
          criticalGases: ieee.criticalGases,
          isSealed: ieee.isSealed,
          ieeeLimits: ieee.limits
        };
      });
      setHistory(formatted);
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
              <div className={`${history[history.length - 1].ieeeCondition === 1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} p-3 rounded-full`}>
                {history[history.length - 1].ieeeCondition === 1 ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>}
              </div>
              <div>
                <p className="text-sm text-slate-500">IEEE 2019 Status</p>
                <p className="text-xl font-bold text-slate-800">{history[history.length - 1].ieeeMeta.label}</p>
                <p className={`text-sm font-semibold ${history[history.length - 1].ieeeMeta.color.replace('bg-', 'text-')}`}>
                   {history[history.length - 1].ieeeMeta.description} 
                   {history[history.length - 1].exceededGases.length > 0 && ` (${history[history.length - 1].exceededGases.join(', ')})`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <div className="glass-panel p-4 inline-block">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center justify-center gap-2">
                <Activity size={16} className="text-primary" />
                Reference Limits Table
              </h3>
              <div className="overflow-x-auto">
                <table className="w-max mx-auto text-center text-[11px] border-2 border-black border-collapse">
                <thead>
                  <tr>
                    <th colSpan="8" className="border-2 border-black px-2 py-0.5 font-bold bg-white text-black">Normal Range</th>
                  </tr>
                  <tr className="bg-white text-black font-bold border-2 border-black">
                    <th className="border-2 border-black px-2 py-0.5">O2/N2</th>
                    <th className="border-2 border-black px-2 py-0.5">CO</th>
                    <th className="border-2 border-black px-2 py-0.5">CH4</th>
                    <th className="border-2 border-black px-2 py-0.5 bg-red-600 text-white">C2H2</th>
                    <th className="border-2 border-black px-2 py-0.5">C2H6</th>
                    <th className="border-2 border-black px-2 py-0.5">C2H4</th>
                    <th className="border-2 border-black px-2 py-0.5">CO2</th>
                    <th className="border-2 border-black px-2 py-0.5">H2</th>
                  </tr>
                </thead>
                <tbody className="font-bold border-2 border-black">
                  <tr className="bg-[#c2deb4] text-black border-b border-black">
                    <td rowSpan="2" className="border-2 border-black px-2 py-0.5">&lt; 0.2</td>
                    <td className="border border-black px-2 py-0.5">900</td>
                    <td className="border border-black px-2 py-0.5">90</td>
                    <td className="border border-black px-2 py-0.5">1</td>
                    <td className="border border-black px-2 py-0.5">90</td>
                    <td className="border border-black px-2 py-0.5">50</td>
                    <td className="border border-black px-2 py-0.5">9000</td>
                    <td className="border border-black px-2 py-0.5">80</td>
                  </tr>
                  <tr className="bg-[#c2deb4] text-black border-2 border-black">
                    <td className="border border-black px-2 py-0.5">1100</td>
                    <td className="border border-black px-2 py-0.5">150</td>
                    <td className="border border-black px-2 py-0.5">2</td>
                    <td className="border border-black px-2 py-0.5">175</td>
                    <td className="border border-black px-2 py-0.5">100</td>
                    <td className="border border-black px-2 py-0.5">12500</td>
                    <td className="border border-black px-2 py-0.5">200</td>
                  </tr>
                  <tr className="bg-red-600 text-black border-b border-black">
                    <td rowSpan="2" className="border-2 border-black px-2 py-0.5 text-white">&gt;= 0.2</td>
                    <td className="border border-black px-2 py-0.5">500</td>
                    <td className="border border-black px-2 py-0.5">20</td>
                    <td className="border border-black px-2 py-0.5">2</td>
                    <td className="border border-black px-2 py-0.5">15</td>
                    <td className="border border-black px-2 py-0.5">50</td>
                    <td className="border border-black px-2 py-0.5">5000</td>
                    <td className="border border-black px-2 py-0.5">40</td>
                  </tr>
                  <tr className="bg-red-600 text-black border-2 border-black">
                    <td className="border border-black px-2 py-0.5">600</td>
                    <td className="border border-black px-2 py-0.5">50</td>
                    <td className="border border-black px-2 py-0.5">7</td>
                    <td className="border border-black px-2 py-0.5">40</td>
                    <td className="border border-black px-2 py-0.5">100</td>
                    <td className="border border-black px-2 py-0.5">7000</td>
                    <td className="border border-black px-2 py-0.5">90</td>
                  </tr>
                </tbody>
              </table>
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
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 px-4 font-semibold text-slate-600">Sample Date</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">IEEE 2019 Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">O2/N2 Ratio</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">H2 (ppm)</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">CO (ppm)</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">{row.chartDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.ieeeMeta.color}`}>
                          {row.ieeeMeta.label}
                        </span>
                        {row.exceededGases.length > 0 && (
                           <span className="block mt-1 text-[10px] text-slate-500 font-medium">High: {row.exceededGases.join(', ')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{row.o2_n2_ratio} <span className="text-xs text-slate-400">({row.isSealed ? 'Sealed' : 'Breathing'})</span></td>
                      <td className={`py-3 px-4 font-mono text-sm ${row.criticalGases?.includes('H2') ? 'text-red-700 font-bold bg-red-100' : row.exceededGases.includes('H2') ? 'text-amber-700 font-bold bg-amber-50' : ''}`}>{row.h2}</td>
                      <td className={`py-3 px-4 font-mono text-sm ${row.criticalGases?.includes('CO') ? 'text-red-700 font-bold bg-red-100' : row.exceededGases.includes('CO') ? 'text-amber-700 font-bold bg-amber-50' : ''}`}>{row.co}</td>
                      <td className="py-3 px-4">{row.recommended || '-'}</td>
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
