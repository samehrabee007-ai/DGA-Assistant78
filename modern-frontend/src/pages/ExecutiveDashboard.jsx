import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, Zap, Droplets, Thermometer, ShieldAlert, ShieldCheck, Download, FileText, PlusCircle, Maximize2, Search } from 'lucide-react';
import { evaluateIEEE } from '../utils/ieeeStandard';

// Duval Triangle Fault Zones Simplified Assessment
const assessDuval = (ch4, c2h4, c2h2) => {
  if (!ch4 && !c2h4 && !c2h2) return 'Unknown';
  const total = ch4 + c2h4 + c2h2;
  if (total === 0) return 'Normal';
  
  const pCH4 = (ch4 / total) * 100;
  const pC2H4 = (c2h4 / total) * 100;
  const pC2H2 = (c2h2 / total) * 100;

  if (pC2H2 >= 98) return 'PD'; // Partial Discharge
  if (pC2H2 < 4 && pC2H4 < 20 && pCH4 >= 98) return 'T1'; // Thermal fault < 300C
  if (pC2H2 < 4 && pC2H4 >= 20 && pC2H4 < 50) return 'T2'; // Thermal fault 300C - 700C
  if (pC2H2 < 15 && pC2H4 >= 50) return 'T3'; // Thermal fault > 700C
  if (pC2H2 >= 4 && pC2H2 < 13 && pC2H4 < 50) return 'D1'; // Discharges of low energy
  if (pC2H2 >= 13 && pC2H2 < 29) return 'D2'; // Discharges of high energy
  if (pC2H2 >= 29) return 'D2';
  
  return 'DT'; // Mix of thermal and electrical
};

const assessRogers = (ch4, h2, c2h2, c2h4, c2h6) => {
  if (!ch4 || !h2 || !c2h2 || !c2h4 || !c2h6) return { ch4_h2: '-', c2h2_c2h4: '-', c2h4_c2h6: '-', diag: 'Insufficient Data' };
  const r1 = ch4/h2;
  const r2 = c2h2/c2h4;
  const r5 = c2h4/c2h6;
  let diag = 'Normal';
  if (r2 < 0.1 && r1 >= 0.1 && r1 <= 1 && r5 < 1) diag = 'Normal';
  else if (r2 < 0.1 && r1 < 0.1 && r5 < 1) diag = 'Partial Discharge';
  else if (r2 >= 0.1 && r2 <= 3 && r1 >= 0.1 && r1 <= 1 && r5 > 3) diag = 'High Energy Arcing';
  else if (r2 < 0.1 && r1 > 1 && r5 < 1) diag = 'Low Temperature Thermal';
  else if (r2 < 0.1 && r1 > 1 && r5 >= 1 && r5 <= 3) diag = 'Thermal < 700C';
  else if (r2 < 0.1 && r1 > 1 && r5 > 3) diag = 'Thermal > 700C';
  return { ch4_h2: r1.toFixed(2), c2h2_c2h4: r2.toFixed(2), c2h4_c2h6: r5.toFixed(2), diag };
};

export default function ExecutiveDashboard() {
  const [transformers, setTransformers] = useState([]);
  const [samples, setSamples] = useState([]);
  const [selectedSubstation, setSelectedSubstation] = useState('');
  const [selectedTransformer, setSelectedTransformer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, samplesRes] = await Promise.all([
        axios.get('https://dga-backend-4d39.onrender.com/api/transformers/list'),
        axios.get('https://dga-backend-4d39.onrender.com/api/samples')
      ]);
      setTransformers(transRes.data);
      setSamples(samplesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const substations = [...new Set(transformers.map(t => t.substation))];
  const availableTransformers = transformers.filter(t => t.substation === selectedSubstation).map(t => t.transformer);

  // Process Fleet Data
  const fleetLatestSamples = {};
  samples.forEach(s => {
    const key = `${s.substation}::${s.transformer}`;
    if (!fleetLatestSamples[key] || new Date(s.sampleDate) > new Date(fleetLatestSamples[key].sampleDate)) {
      fleetLatestSamples[key] = s;
    }
  });

  const fleetStats = { total: 0, critical: 0, warning: 0, monitor: 0, healthy: 0 };
  const fleetList = Object.values(fleetLatestSamples).map(s => {
    const ieee = evaluateIEEE(s);
    let hi = 100;
    if (ieee.condition === 4) { hi -= 60; fleetStats.critical++; }
    else if (ieee.condition === 3) { hi -= 40; fleetStats.warning++; }
    else if (ieee.condition === 2) { hi -= 20; fleetStats.monitor++; }
    else { fleetStats.healthy++; }
    
    fleetStats.total++;
    
    return {
      ...s,
      ieee,
      healthIndex: hi > 0 ? hi : 10
    };
  }).sort((a, b) => a.healthIndex - b.healthIndex);

  // Selected Transformer Data
  let transformerHistory = [];
  if (selectedSubstation && selectedTransformer) {
    transformerHistory = samples
      .filter(s => s.substation === selectedSubstation && s.transformer === selectedTransformer)
      .sort((a, b) => new Date(a.sampleDate) - new Date(b.sampleDate))
      .map(item => {
        let chartDateStr = 'Unknown';
        if (item.sampleDate) {
          const d = new Date(item.sampleDate);
          chartDateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        }
        return {
          ...item,
          chartDate: chartDateStr,
          o2_n2_ratio: item.o2_n2_ratio || (item.o2 && item.n2 ? parseFloat((item.o2 / item.n2).toFixed(2)) : 0),
          tdcg: (item.h2||0) + (item.ch4||0) + (item.c2h6||0) + (item.c2h4||0) + (item.c2h2||0) + (item.co||0)
        };
      });
  }

  // Deduplicate for charts
  const uniqueHistory = [];
  const seenDates = new Set();
  transformerHistory.forEach(s => {
    if(!seenDates.has(s.chartDate)) {
      seenDates.add(s.chartDate);
      uniqueHistory.push(s);
    }
  });

  const latestSample = uniqueHistory[uniqueHistory.length - 1];
  let ieee = null;
  let duval = 'Unknown';
  let rogers = null;
  let healthIndex = 100;

  if (latestSample) {
    ieee = evaluateIEEE(latestSample);
    duval = assessDuval(latestSample.ch4 || 0, latestSample.c2h4 || 0, latestSample.c2h2 || 0);
    rogers = assessRogers(latestSample.ch4, latestSample.h2, latestSample.c2h2, latestSample.c2h4, latestSample.c2h6);
    if (ieee.condition === 4) healthIndex -= 60;
    else if (ieee.condition === 3) healthIndex -= 40;
    else if (ieee.condition === 2) healthIndex -= 20;
    healthIndex = Math.max(10, healthIndex);
  }

  // Mock Oil Quality & Paper Insulation
  const mockOil = { bdv: 68, moisture: 12, acidity: 0.03, ift: 42, tanDelta: 0.2 };
  const mockPaper = { furan: 0.5, dp: 800, life: 18 };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading SCADA Engine...</div>;
  }

  return (
    <div className="space-y-6 bg-[#F5F7FA] min-h-screen -m-8 p-8 font-sans">
      
      {/* Header Panel */}
      <div className="bg-[#2563EB] text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-3">
          <Activity size={32} className="text-blue-200" />
          <div>
            <h1 className="text-2xl font-bold tracking-wider uppercase">Transformer Health Monitoring System</h1>
            <p className="text-blue-200 text-sm opacity-90">Industrial APM Dashboard - Live Analytics</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4 text-sm font-medium">
          <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-blue-200">Last Update:</span> {new Date().toLocaleString('en-GB')}
          </div>
        </div>
      </div>

      {!selectedTransformer ? (
        /* Fleet Dashboard View */
        <div className="space-y-6 animate-fade-in">
          {/* Fleet KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-slate-300">
              <p className="text-xs text-slate-500 font-bold uppercase">Total Assets</p>
              <p className="text-2xl font-bold text-slate-800">{fleetStats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#10B981]">
              <p className="text-xs text-slate-500 font-bold uppercase">Healthy</p>
              <p className="text-2xl font-bold text-[#10B981]">{fleetStats.healthy}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#3B82F6]">
              <p className="text-xs text-slate-500 font-bold uppercase">Monitor</p>
              <p className="text-2xl font-bold text-[#3B82F6]">{fleetStats.monitor}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#F59E0B]">
              <p className="text-xs text-slate-500 font-bold uppercase">Warning</p>
              <p className="text-2xl font-bold text-[#F59E0B]">{fleetStats.warning}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#EF4444]">
              <p className="text-xs text-slate-500 font-bold uppercase">Critical</p>
              <p className="text-2xl font-bold text-[#EF4444]">{fleetStats.critical}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Selection Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-1 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                <Search size={18}/> Asset Selection
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Substation</label>
                  <select 
                    value={selectedSubstation}
                    onChange={(e) => { setSelectedSubstation(e.target.value); setSelectedTransformer(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">-- All Substations --</option>
                    {substations.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transformer</label>
                  <select 
                    value={selectedTransformer}
                    onChange={(e) => setSelectedTransformer(e.target.value)}
                    disabled={!selectedSubstation}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">-- Select Transformer --</option>
                    {availableTransformers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Top Critical List */}
            <div className="bg-white p-0 rounded-xl shadow-sm lg:col-span-2 border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-[#EF4444]"/> Fleet Watchlist (Ranked by Risk)
                </h3>
              </div>
              <div className="overflow-y-auto max-h-64">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white sticky top-0 border-b shadow-sm z-10">
                    <tr>
                      <th className="py-2 px-4 text-slate-500 font-bold uppercase text-xs">Rank</th>
                      <th className="py-2 px-4 text-slate-500 font-bold uppercase text-xs">Transformer</th>
                      <th className="py-2 px-4 text-slate-500 font-bold uppercase text-xs">Substation</th>
                      <th className="py-2 px-4 text-slate-500 font-bold uppercase text-xs">Health Index</th>
                      <th className="py-2 px-4 text-slate-500 font-bold uppercase text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleetList.map((asset, idx) => (
                      <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedSubstation(asset.substation); setSelectedTransformer(asset.transformer); }}>
                        <td className="py-3 px-4 font-mono text-slate-600 font-bold">#{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-blue-600">{asset.transformer}</td>
                        <td className="py-3 px-4 text-slate-600">{asset.substation}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                              <div className={`h-full ${asset.healthIndex < 50 ? 'bg-[#EF4444]' : asset.healthIndex < 80 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`} style={{ width: `${asset.healthIndex}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{asset.healthIndex}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold shadow-sm ${asset.ieee.meta.color.replace('bg-', 'bg-').replace('text-', 'text-')}`}>
                            {asset.ieee.meta.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Single Asset Dashboard */
        <div className="space-y-4 animate-fade-in">
          {/* Asset Navigation & Actions */}
          <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedTransformer('')} className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                ← Back to Fleet
              </button>
              <h2 className="text-xl font-bold text-slate-800 border-l pl-4 border-slate-300">
                {selectedSubstation} / <span className="text-blue-600">{selectedTransformer}</span>
              </h2>
            </div>
            <button className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
              <FileText size={16}/> Generate Report PDF
            </button>
          </div>

          {latestSample ? (
            <>
              {/* Primary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-t-4 border-[#2563EB] relative overflow-hidden group">
                  <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={40}/></div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Health Index</p>
                  <p className={`text-3xl font-black ${healthIndex < 50 ? 'text-[#EF4444]' : healthIndex < 80 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>{healthIndex}%</p>
                </div>
                <div className={`bg-white p-4 rounded-xl shadow-sm text-center border-t-4 ${ieee.condition === 4 ? 'border-[#EF4444]' : ieee.condition === 3 ? 'border-[#F59E0B]' : ieee.condition === 2 ? 'border-blue-500' : 'border-[#10B981]'}`}>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">DGA Status</p>
                  <p className={`text-xl font-black mt-2 ${ieee.condition === 4 ? 'text-[#EF4444]' : ieee.condition === 3 ? 'text-[#F59E0B]' : ieee.condition === 2 ? 'text-blue-500' : 'text-[#10B981]'}`}>Cond. {ieee.condition}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-t-4 border-slate-300">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">TDCG</p>
                  <p className="text-2xl font-black text-slate-700">{latestSample.tdcg} <span className="text-xs">ppm</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-t-4 border-slate-300">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">O2/N2 Ratio</p>
                  <p className="text-2xl font-black text-slate-700">{latestSample.o2_n2_ratio}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-t-4 border-[#10B981]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Rem. Life</p>
                  <p className="text-2xl font-black text-[#10B981]">{mockPaper.life} <span className="text-xs">Yrs</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center border-t-4 border-slate-300">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Risk Score</p>
                  <p className={`text-xl font-black mt-2 ${healthIndex < 50 ? 'text-[#EF4444]' : healthIndex < 80 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>{healthIndex < 50 ? 'High' : healthIndex < 80 ? 'Medium' : 'Low'}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2"><Activity size={16} className="text-blue-600"/> DGA Key Gases Trend (ppm)</h3>
                    <Maximize2 size={14} className="text-slate-400 cursor-pointer hover:text-slate-700" />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={uniqueHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="chartDate" tick={{fontSize: 10}} stroke="#94a3b8" />
                        <YAxis tick={{fontSize: 10}} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="h2" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="H2" />
                        <Line type="monotone" dataKey="ch4" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="CH4" />
                        <Line type="monotone" dataKey="c2h4" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="C2H4" />
                        <Line type="monotone" dataKey="c2h2" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="C2H2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2"><Activity size={16} className="text-blue-600"/> TDCG & CO Trend (ppm)</h3>
                    <Maximize2 size={14} className="text-slate-400 cursor-pointer hover:text-slate-700" />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={uniqueHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="chartDate" tick={{fontSize: 10}} stroke="#94a3b8" />
                        <YAxis tick={{fontSize: 10}} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="tdcg" stroke="#0F172A" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="TDCG" />
                        <Line type="monotone" dataKey="co" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="CO" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Advanced Diagnostics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Duval Triangle Text Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03]">
                    <svg width="150" height="150" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="50,10 90,90 10,90" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase border-b pb-2 mb-4 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 100 100" fill="none" className="text-blue-600"><polygon points="50,10 90,90 10,90" fill="currentColor" /></svg>
                      Duval Triangle Analysis
                    </h3>
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Current Fault Zone</span>
                        <span className={`px-3 py-1 rounded text-sm font-black shadow-sm ${duval === 'Normal' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{duval}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Previous Zone</span>
                        <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded">{uniqueHistory.length > 1 ? assessDuval(uniqueHistory[uniqueHistory.length-2].ch4||0, uniqueHistory[uniqueHistory.length-2].c2h4||0, uniqueHistory[uniqueHistory.length-2].c2h2||0) : '-'}</span>
                      </div>
                    </div>
                  </div>
                  {duval !== 'Normal' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start text-xs text-red-700 shadow-sm">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-600" />
                      <span className="font-medium leading-relaxed">Active fault escalation detected according to IEC 60599 Duval Triangle.</span>
                    </div>
                  )}
                </div>

                {/* Rogers Ratio */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase border-b pb-2 mb-4 flex items-center gap-2">
                      <Activity size={16} className="text-blue-600"/> Rogers Ratio Assessment
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase tracking-wider text-left border-b border-slate-100">
                          <th className="pb-2 font-bold">Ratio</th>
                          <th className="pb-2 font-bold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 font-mono text-sm">
                        <tr className="border-b border-slate-50"><td className="py-2.5">CH4/H2</td><td className="py-2.5 font-bold">{rogers.ch4_h2}</td></tr>
                        <tr className="border-b border-slate-50"><td className="py-2.5">C2H2/C2H4</td><td className="py-2.5 font-bold">{rogers.c2h2_c2h4}</td></tr>
                        <tr className="border-b border-slate-50"><td className="py-2.5">C2H4/C2H6</td><td className="py-2.5 font-bold">{rogers.c2h4_c2h6}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Diagnosis Result</span>
                    <span className="text-xs font-black text-slate-800">{rogers.diag}</span>
                  </div>
                </div>

                {/* O2/N2 Assessment */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase border-b pb-2 mb-4 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-600"/> IEEE O2/N2 Assessment
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                        <span className="text-xs font-bold text-slate-500 uppercase">O2 Level</span>
                        <span className="font-mono font-bold text-slate-700">{latestSample.o2 || '-'} <span className="text-[10px] font-normal text-slate-400">ppm</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                        <span className="text-xs font-bold text-slate-500 uppercase">N2 Level</span>
                        <span className="font-mono font-bold text-slate-700">{latestSample.n2 || '-'} <span className="text-[10px] font-normal text-slate-400">ppm</span></span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-slate-100">
                        <span className="text-xs font-black text-slate-700 uppercase">Ratio Result</span>
                        <span className="font-mono font-black text-xl text-blue-600">{latestSample.o2_n2_ratio}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-4 flex items-center justify-center gap-2 p-3 rounded-lg shadow-sm border ${ieee.isSealed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'} text-xs font-bold`}>
                    <ShieldCheck size={18} />
                    {ieee.isSealed ? 'Sealed Transformer - No Air Ingress' : 'Breathing / Free Air Access'}
                  </div>
                </div>
              </div>

              {/* Oil Quality & Alarms Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Alarm Center */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm uppercase border-b pb-2 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[#F59E0B]"/> Live Alarm Center
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['h2', 'ch4', 'c2h2', 'c2h4', 'c2h6', 'co'].map(gas => {
                      const val = latestSample[gas] || 0;
                      const isCrit = val > ieee.limits95[gas];
                      const isWarn = val > ieee.limits90[gas];
                      const color = isCrit ? 'bg-[#EF4444] text-white border-red-500' : isWarn ? 'bg-[#F59E0B] text-white border-orange-500' : 'bg-[#10B981] text-white border-green-500';
                      const label = isCrit ? 'Critical' : isWarn ? 'Warning' : 'Normal';
                      
                      return (
                        <div key={gas} className="border rounded-lg p-3 flex flex-col justify-between items-center bg-slate-50 shadow-sm relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
                          <span className="text-sm font-black uppercase text-slate-700 mb-2">{gas}</span>
                          <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase shadow-sm ${color}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute -right-6 -top-6 opacity-[0.03] text-blue-600">
                    <Zap size={150} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase border-b pb-2 mb-4 flex items-center gap-2 relative z-10">
                      <Activity size={16} className="text-[#2563EB]"/> AI Diagnostic Engine
                    </h3>
                    <div className="space-y-3 text-sm text-slate-700 relative z-10">
                      {healthIndex < 50 ? (
                        <>
                          <p className="font-bold text-red-600 flex gap-2 items-center text-lg"><AlertTriangle size={18}/> Critical fault conditions detected.</p>
                          <p className="leading-relaxed">Gas concentrations indicate active internal faults. Historical trend shows rapid escalation of fault gases.</p>
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-bold shadow-sm">
                            Recommendation: Schedule immediate outage for physical inspection and advanced electrical testing.
                          </div>
                        </>
                      ) : healthIndex < 80 ? (
                        <>
                          <p className="font-bold text-orange-600 flex gap-2 items-center text-lg"><Clock size={18}/> Early fault progression observed.</p>
                          <p className="leading-relaxed">Elevated key gases present. Needs close monitoring to determine fault generation rate and identify potential thermal or electrical issues.</p>
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 font-bold shadow-sm">
                            Recommendation: Decrease sampling interval to 3 months. Review operational load history.
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-green-600 flex gap-2 items-center text-lg"><CheckCircle size={18}/> Transformer condition is stable.</p>
                          <p className="leading-relaxed">Gas concentrations are within normal operational limits. No active fault progression detected based on recent samples.</p>
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 font-bold shadow-sm">
                            Recommendation: Continue normal operation. Next DGA sample per standard schedule (12 months).
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Mock Data Section (Oil Quality & Paper) */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                 <h3 className="font-bold text-slate-800 text-sm uppercase border-b pb-2 mb-4 flex items-center gap-2">
                    <Droplets size={16} className="text-blue-500"/> Physical-Chemical & Paper Insulation Dashboard (Simulated Data)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={40}/></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Breakdown Voltage</p>
                      <p className="text-2xl font-black text-slate-800">{mockOil.bdv} <span className="text-xs font-bold text-slate-400">kV</span></p>
                      <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">🟢 Excellent</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity"><Droplets size={40}/></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Moisture</p>
                      <p className="text-2xl font-black text-slate-800">{mockOil.moisture} <span className="text-xs font-bold text-slate-400">ppm</span></p>
                      <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">🟢 Good</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity"><Thermometer size={40}/></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Acidity</p>
                      <p className="text-2xl font-black text-slate-800">{mockOil.acidity}</p>
                      <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">🟢 Excellent</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={40}/></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Tan Delta</p>
                      <p className="text-2xl font-black text-slate-800">{mockOil.tanDelta}</p>
                      <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">🟢 Good</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={40}/></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Furan (2FAL)</p>
                      <p className="text-2xl font-black text-slate-800">{mockPaper.furan} <span className="text-xs font-bold text-slate-400">ppm</span></p>
                      <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">🟢 Normal</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck size={40}/></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Est. DP Value</p>
                      <p className="text-2xl font-black text-slate-800">{mockPaper.dp}</p>
                      <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">🟢 Solid</span>
                    </div>
                  </div>
              </div>

            </>
          ) : (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center text-slate-500">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-20"/>
              No historical samples found for this transformer to generate insights.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
