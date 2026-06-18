import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Download, Search } from 'lucide-react';

export default function Dashboard() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSamples = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/samples');
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

  const handleDelete = async (id) => {
    if(!confirm('Are you sure you want to delete this sample?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/samples/${id}`);
      setSamples(samples.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const columns = ["substation", "transformer", "sampleDate", "h2", "ch4", "c2h6", "c2h4", "c2h2", "co", "co2", "dga", "recommended"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Samples Database</h1>
        <button className="btn-secondary">
          <Download size={18} />
          Export to Excel
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b flex gap-4 items-center bg-white/50">
          <Search className="text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search samples..." 
            className="bg-transparent border-none focus:outline-none w-full text-slate-700"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map(col => (
                  <th key={col} className="p-4 font-semibold text-slate-600 capitalize whitespace-nowrap">
                    {col.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
                <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">Loading data...</td></tr>
              ) : samples.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">No samples found. Import a PDF to get started.</td></tr>
              ) : (
                samples.map(sample => (
                  <tr key={sample.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    {columns.map(col => (
                      <td key={col} className="p-4 text-slate-700 whitespace-nowrap">
                        {col.includes('Date') && sample[col] 
                          ? new Date(sample[col]).toLocaleDateString() 
                          : sample[col] || '-'}
                      </td>
                    ))}
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(sample.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
