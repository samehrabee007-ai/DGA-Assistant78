import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Download, Search, Activity, ArrowUpDown, Filter, SortAsc, SortDesc, Edit2, Save, X } from 'lucide-react';
import { evaluateIEEE } from '../utils/ieeeStandard';

const calculateNextDate = (sampleDate, recommended) => {
  if (!sampleDate || !recommended) return null;
  const match = recommended.match(/R\s*(\d+)/i);
  if (!match) return null;
  const months = parseInt(match[1], 10);
  const d = new Date(sampleDate);
  d.setMonth(d.getMonth() + months);
  return d;
};

export default function Dashboard({ userRole }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [columnFilters, setColumnFilters] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const handleOpenDropdown = (col) => {
    if (activeDropdown === col) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(col);
      setDropdownSearch('');
    }
  };

  const getUniqueValues = (col) => {
    const vals = samples.map(s => String(s[col] || ''));
    return [...new Set(vals)].sort();
  };

  const handleToggleFilter = (col, val) => {
    const currentList = columnFilters[col] || getUniqueValues(col);
    let newList;
    if (currentList.includes(val)) {
      newList = currentList.filter(v => v !== val);
    } else {
      newList = [...currentList, val];
    }
    
    const allVals = getUniqueValues(col);
    if (newList.length === allVals.length) {
      const newFilters = {...columnFilters};
      delete newFilters[col];
      setColumnFilters(newFilters);
    } else {
      setColumnFilters({...columnFilters, [col]: newList});
    }
  };

  const handleToggleAll = (col) => {
    const allVals = getUniqueValues(col);
    const currentList = columnFilters[col] || allVals;
    if (currentList.length === allVals.length) {
      setColumnFilters({...columnFilters, [col]: []});
    } else {
      const newFilters = {...columnFilters};
      delete newFilters[col];
      setColumnFilters(newFilters);
    }
  };

  const fetchSamples = async () => {
    try {
      const res = await axios.get('https://dga-backend-4d39.onrender.com/api/samples');
      setSamples(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  let processedSamples = [...samples];

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    processedSamples = processedSamples.filter(s => 
      s.substation?.toLowerCase().includes(term) || s.transformer?.toLowerCase().includes(term)
    );
  }

  if (statusFilter !== 'All') {
    processedSamples = processedSamples.filter(s => {
      const ieee = evaluateIEEE(s);
      if (statusFilter === 'Normal' && ieee.condition !== 1) return false;
      if (statusFilter === 'Monitor' && ieee.condition !== 2) return false;
      if (statusFilter === 'Warning' && ieee.condition !== 3) return false;
      if (statusFilter === 'Critical' && ieee.condition !== 4) return false;
      return true;
    });
  }

  Object.keys(columnFilters).forEach(col => {
    if (columnFilters[col] && columnFilters[col].length > 0) {
      processedSamples = processedSamples.filter(s => 
        columnFilters[col].includes(String(s[col] || ''))
      );
    }
  });

  if (sortConfig.key) {
    processedSamples.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'sampleDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortConfig.key === 'nextAnalysisDate') {
        aVal = calculateNextDate(a.sampleDate, a.recommended)?.getTime() || 0;
        bVal = calculateNextDate(b.sampleDate, b.recommended)?.getTime() || 0;
      } else if (sortConfig.key === 'o2_n2_ratio') {
        aVal = aVal ? parseFloat(aVal) : (a.o2 && a.n2 ? a.o2/a.n2 : 0);
        bVal = bVal ? parseFloat(bVal) : (b.o2 && b.n2 ? b.o2/b.n2 : 0);
      } else if (['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co'].includes(sortConfig.key)) {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key, forcedDirection) => {
    let direction = 'asc';
    if (forcedDirection) {
      direction = forcedDirection;
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEditClick = (sample) => {
    setEditingId(sample.id);
    const formData = { ...sample };
    if (formData.sampleDate) formData.sampleDate = new Date(formData.sampleDate).toISOString().split('T')[0];
    setEditFormData(formData);
  };

  const handleEditChange = (col, value) => {
    setEditFormData({ ...editFormData, [col]: value });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await axios.put(`https://dga-backend-4d39.onrender.com/api/samples/${editingId}`, editFormData);
      setSamples(samples.map(s => s.id === editingId ? res.data : s));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if(!confirm('Are you sure you want to delete this sample?')) return;
    try {
      await axios.delete(`https://dga-backend-4d39.onrender.com/api/samples/${id}`);
      setSamples(samples.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const columns = ["substation", "transformer", "sampleDate", "h2", "ch4", "c2h6", "c2h4", "c2h2", "co", "o2_n2_ratio", "ieee_status", "dga", "resultOfAnalysis", "recommended", "nextAnalysisDate"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Samples Database</h1>
        {userRole === 'admin' && (
          <button className="btn-secondary">
            <Download size={18} />
            Export to Excel
          </button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-2">
        <div className="glass-panel p-4 inline-block">
          <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center justify-center gap-2">
            <Activity size={16} className="text-primary" />
            IEEE C57.104-2019 (Screening Limits)
          </h3>
          <p className="text-xs text-slate-500 mb-3 text-center">Based on O2/N2 Interpretation. (Not official condition limits)</p>
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

        <div className="glass-panel p-4 inline-block">
          <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center justify-center gap-2">
            <Activity size={16} className="text-primary" />
            IEEE Gas Condition Limits
          </h3>
          <p className="text-xs text-slate-500 mb-3 text-center">Independent evaluation for diagnostic conditions</p>
          <div className="overflow-x-auto">
            <table className="w-max mx-auto text-center text-[11px] border-2 border-black border-collapse">
            <thead>
              <tr className="bg-white text-black font-bold border-2 border-black">
                <th className="border-2 border-black px-2 py-0.5">Gas</th>
                <th className="border-2 border-black px-2 py-0.5 bg-green-100">Cond.1</th>
                <th className="border-2 border-black px-2 py-0.5 bg-yellow-100">Cond.2</th>
                <th className="border-2 border-black px-2 py-0.5 bg-orange-100">Cond.3</th>
                <th className="border-2 border-black px-2 py-0.5 bg-red-600 text-white">Cond.4</th>
              </tr>
            </thead>
            <tbody className="font-bold border-2 border-black">
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">H2</td><td className="border px-2 py-0.5">100</td><td className="border px-2 py-0.5">700</td><td className="border px-2 py-0.5">1800</td><td className="border px-2 py-0.5">&gt;1800</td></tr>
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">CH4</td><td className="border px-2 py-0.5">120</td><td className="border px-2 py-0.5">400</td><td className="border px-2 py-0.5">1000</td><td className="border px-2 py-0.5">&gt;1000</td></tr>
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">C2H2</td><td className="border px-2 py-0.5">1</td><td className="border px-2 py-0.5">9</td><td className="border px-2 py-0.5">35</td><td className="border px-2 py-0.5">&gt;35</td></tr>
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">C2H4</td><td className="border px-2 py-0.5">50</td><td className="border px-2 py-0.5">100</td><td className="border px-2 py-0.5">200</td><td className="border px-2 py-0.5">&gt;200</td></tr>
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">C2H6</td><td className="border px-2 py-0.5">65</td><td className="border px-2 py-0.5">100</td><td className="border px-2 py-0.5">150</td><td className="border px-2 py-0.5">&gt;150</td></tr>
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">CO</td><td className="border px-2 py-0.5">350</td><td className="border px-2 py-0.5">570</td><td className="border px-2 py-0.5">1400</td><td className="border px-2 py-0.5">&gt;1400</td></tr>
              <tr className="bg-white text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">CO2</td><td className="border px-2 py-0.5">2500</td><td className="border px-2 py-0.5">4000</td><td className="border px-2 py-0.5">10000</td><td className="border px-2 py-0.5">&gt;10000</td></tr>
              <tr className="bg-slate-200 text-black border-b border-black"><td className="border-2 border-black px-2 py-0.5 font-bold">TDCG</td><td className="border px-2 py-0.5">720</td><td className="border px-2 py-0.5">1920</td><td className="border px-2 py-0.5">4630</td><td className="border px-2 py-0.5">&gt;4630</td></tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b flex gap-4 items-center bg-white/50">
          <Search className="text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search samples..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-sm font-medium text-slate-500">Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-md text-sm p-1.5 outline-none focus:ring-2 focus:ring-primary/20 text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Normal">Normal (1)</option>
              <option value="Monitor">Monitor (2)</option>
              <option value="Warning">Warning (3)</option>
              <option value="Critical">Critical (4)</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] border border-slate-200 rounded-lg">
          <table className="w-max text-center text-xs border-collapse relative mx-auto">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr className="border-b border-slate-300">
                {columns.map(col => (
                  <th 
                    key={col} 
                    className="px-1 py-2 text-center font-bold text-[11px] text-slate-700 capitalize whitespace-normal leading-tight bg-slate-100 border-x border-slate-200 relative break-words"
                  >
                    <div 
                      className="flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none group"
                      onClick={() => handleOpenDropdown(col)}
                    >
                      <div className="flex items-center gap-0.5 justify-center">
                        <span>{col === 'ieee_status' ? 'IEEE Status' : col === 'o2_n2_ratio' ? 'O2/N2' : col === 'nextAnalysisDate' ? 'Next Date' : col === 'dga' ? 'DGA' : col === 'resultOfAnalysis' ? 'Fault' : col === 'recommended' ? 'Rec.' : col.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex flex-col opacity-50">
                          <Filter size={10} className={`transition-opacity ${columnFilters[col] ? 'text-primary opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`} />
                          {sortConfig.key === col && <ArrowUpDown size={10} className="text-primary mt-0.5" />}
                        </div>
                      </div>
                    </div>
                    
                    {activeDropdown === col && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-2 text-sm font-normal">
                        <button 
                          className="flex items-center gap-2 w-full text-left p-2 hover:bg-slate-50 rounded text-slate-700" 
                          onClick={() => { handleSort(col, 'asc'); setActiveDropdown(null); }}
                        >
                           <SortAsc size={16} /> Sort A-Z / Ascending
                        </button>
                        <button 
                          className="flex items-center gap-2 w-full text-left p-2 hover:bg-slate-50 rounded text-slate-700 mt-1" 
                          onClick={() => { handleSort(col, 'desc'); setActiveDropdown(null); }}
                        >
                           <SortDesc size={16} /> Sort Z-A / Descending
                        </button>
                        
                        {['substation', 'transformer', 'sampleDate'].includes(col) && (() => {
                          const allVals = getUniqueValues(col);
                          const filteredVals = allVals.filter(v => v.toLowerCase().includes(dropdownSearch.toLowerCase()));
                          const selectedVals = columnFilters[col] || allVals;
                          const isAllSelected = selectedVals.length === allVals.length;

                          return (
                          <>
                            <div className="my-2 border-t border-slate-100"></div>
                            <input 
                              type="text" 
                              placeholder={`Search ${col}...`}
                              className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-primary/50 text-slate-600 bg-white mb-2"
                              value={dropdownSearch}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setDropdownSearch(e.target.value)}
                            />
                            <div className="max-h-40 overflow-y-auto flex flex-col gap-1 text-slate-700 text-xs">
                              {dropdownSearch === '' && (
                                <label className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); handleToggleAll(col); }}>
                                  <input type="checkbox" checked={isAllSelected} onChange={() => {}} className="cursor-pointer" />
                                  <span>(Select All)</span>
                                </label>
                              )}
                              {filteredVals.map(val => (
                                <label key={val} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); handleToggleFilter(col, val); }}>
                                  <input type="checkbox" checked={selectedVals.includes(val)} onChange={() => {}} className="cursor-pointer" />
                                  <span>{val || '(Blank)'}</span>
                                </label>
                              ))}
                            </div>
                            {columnFilters[col] && (
                                <button 
                                  className="mt-2 text-xs text-primary w-full text-center p-1 rounded bg-slate-50 hover:bg-slate-100 font-medium"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const newFilters = {...columnFilters};
                                    delete newFilters[col];
                                    setColumnFilters(newFilters); 
                                  }}
                                >
                                  Clear Filter
                                </button>
                            )}
                          </>
                        )})()}
                      </div>
                    )}
                  </th>
                ))}
                {userRole === 'admin' && <th className="px-2 py-2 text-center font-bold text-slate-700 bg-slate-100 border-l border-slate-200">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">Loading data...</td></tr>
              ) : processedSamples.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">No samples found matching your criteria.</td></tr>
              ) : (
                processedSamples.map(sample => {
                  const ieee = evaluateIEEE(sample);

                  if (editingId === sample.id) {
                     return (
                       <tr key={sample.id} className="border-b border-slate-100 bg-blue-50/50">
                         {columns.map(col => {
                           if (['ieee_status', 'o2_n2_ratio', 'nextAnalysisDate'].includes(col)) {
                             return <td key={col} className="px-2 py-1.5 text-center text-slate-400 border-x border-slate-100">-</td>;
                           }
                           const isDate = col.includes('Date');
                           return (
                             <td key={col} className="p-1 border-x border-slate-100">
                               <input 
                                 type={isDate ? 'date' : ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'].includes(col) ? 'number' : 'text'}
                                 value={editFormData[col] || ''}
                                 onChange={(e) => handleEditChange(col, e.target.value)}
                                 className="w-full text-[11px] p-1 border border-blue-200 rounded outline-none focus:border-blue-500 bg-white"
                               />
                             </td>
                           )
                         })}
                         {userRole === 'admin' && (
                           <td className="px-1 py-1 text-center border-l border-slate-100">
                              <div className="flex gap-2 justify-center">
                                <button onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-800 p-1 bg-white rounded shadow-sm border border-emerald-100" title="Save">
                                  <Save size={16}/>
                                </button>
                                <button onClick={handleCancelEdit} className="text-slate-500 hover:text-slate-700 p-1 bg-white rounded shadow-sm border border-slate-200" title="Cancel">
                                  <X size={16}/>
                                </button>
                              </div>
                           </td>
                         )}
                       </tr>
                     );
                  }

                  return (
                  <tr key={sample.id} className="group border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    {columns.map(col => {
                      if (col === 'o2_n2_ratio') {
                        let ratio = sample.o2_n2_ratio;
                        if (!ratio && sample.o2 && sample.n2) {
                          ratio = (sample.o2 / sample.n2).toFixed(2);
                        } else if (ratio) {
                          ratio = parseFloat(ratio).toFixed(2);
                        }
                        return (
                          <td key={col} className="px-2 py-1.5 text-center whitespace-nowrap font-mono text-slate-700 border-x border-slate-100">
                            {ratio || '-'} 
                            {ratio && <span className="block text-[9px] text-slate-400">({ieee.isSealed ? 'Sealed' : 'Breathing'})</span>}
                          </td>
                        );
                      }
                      if (col === 'ieee_status') {
                        return (
                          <td key={col} className="px-1 py-1 text-center whitespace-nowrap border-x border-slate-100">
                            <div className="flex flex-col gap-0.5 items-center justify-center">
                              <span className={`px-2 py-0.5 border rounded-full text-[10px] font-semibold ${ieee.meta.color}`}>
                                {ieee.meta.label}
                              </span>
                              {ieee.condition >= 2 && ieee.exceededGases.length > 0 && (
                                <span className="text-[9px] text-slate-500 font-medium max-w-[120px] truncate" title={`High: ${ieee.exceededGases.join(', ')}`}>
                                  High: {ieee.exceededGases.join(', ')}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }
                      if (col === 'nextAnalysisDate') {
                        const nextDate = calculateNextDate(sample.sampleDate, sample.recommended);
                        if (!nextDate) return <td key={col} className="px-2 py-1.5 text-center whitespace-nowrap text-slate-500 border-x border-slate-100">-</td>;
                        
                        const isOverdue = nextDate < new Date();
                        return (
                          <td key={col} className={`px-2 py-1.5 text-center whitespace-nowrap font-semibold border-x border-slate-100 ${isOverdue ? 'text-red-600 bg-red-50/50' : 'text-emerald-600'}`}>
                            <div className="flex flex-col items-center justify-center">
                              <span>{nextDate.toLocaleDateString('en-GB')}</span>
                              {isOverdue && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 rounded-full w-max">Overdue</span>}
                            </div>
                          </td>
                        );
                      }

                      const isGas = ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'].includes(col);
                      const isCritical = isGas && sample[col] > ieee.limits95[col];
                      const isElevated = isGas && sample[col] > ieee.limits90[col] && !isCritical;

                      let cellColor = 'text-slate-700';
                      if (isCritical) cellColor = 'text-red-700 font-bold bg-red-100';
                      else if (isElevated) cellColor = 'text-amber-700 font-bold bg-amber-50';

                      return (
                        <td key={col} className={`px-2 py-1.5 text-center whitespace-nowrap border-x border-slate-100 ${isGas ? 'font-mono' : ''} ${cellColor}`} dir={col.includes('Date') ? "ltr" : "auto"}>
                          {col.includes('Date') && sample[col] 
                            ? new Date(sample[col]).toLocaleDateString('en-GB') 
                            : sample[col] || '-'}
                        </td>
                      );
                    })}
                    {userRole === 'admin' && (
                      <td className="px-1 py-1 text-center border-l border-slate-100">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleEditClick(sample)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded" title="Edit sample">
                             <Edit2 size={16} />
                           </button>
                           <button onClick={() => handleDelete(sample.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded" title="Delete sample">
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
