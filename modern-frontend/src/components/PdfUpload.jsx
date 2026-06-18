import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertCircle, FileText, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PdfUpload() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setLoading(true); setError(''); setResults([]);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('pdfs', files[i]);
    }
    
    try {
      const res = await axios.post('http://localhost:3001/api/samples/upload-pdfs', formData);
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Batch Import PDF Reports</h1>
      </div>

      <div className="glass-panel p-8">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 hover:border-primary/50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-700">
              {files.length > 0 ? `${files.length} file(s) selected` : "Drag and drop your PDFs here"}
            </h3>
            <p className="text-sm text-slate-500 mt-2">Upload multiple files at once</p>
            {files.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {files.map(f => (
                  <span key={f.name} className="px-3 py-1 bg-white border rounded-full text-xs text-slate-600 flex items-center gap-1">
                    <FileText size={12}/> {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={files.length === 0 || loading}
              className={`btn-primary ${ (files.length === 0 || loading) ? 'opacity-50 cursor-not-allowed' : '' }`}
            >
              {loading ? 'Processing...' : 'Upload and Process'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="glass-panel p-8 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b pb-4">
             <h2 className="text-xl font-semibold text-slate-800">Processing Results</h2>
             <Link to="/" className="btn-secondary text-sm"><Database size={16}/> Go to Database</Link>
          </div>
          
          <div className="space-y-3">
            {results.map((res, idx) => (
              <div key={idx} className={`p-4 rounded-lg border flex items-center justify-between ${res.status === 'Success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  {res.status === 'Success' ? <CheckCircle className="text-green-600" size={24} /> : <AlertCircle className="text-red-600" size={24} />}
                  <div>
                    <p className="font-medium text-slate-800">{res.fileName}</p>
                    <p className={`text-sm ${res.status === 'Success' ? 'text-green-600' : 'text-red-600'}`}>
                      {res.status === 'Success' ? 'Successfully saved to database' : res.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
