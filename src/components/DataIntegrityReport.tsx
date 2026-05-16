import React from 'react';
import { motion } from 'motion/react';
import { RefreshCcw } from 'lucide-react';

interface ImportStats {
  total: number;
  unique: number;
  duplicates: number;
  skipped: number;
  duplicateEntries: { id: string | number; name: string }[];
  skippedEntries: { name: string; sn: string | number }[];
}

interface DataIntegrityReportProps {
  importStats: ImportStats | null;
  onClose: () => void;
}

export function DataIntegrityReport({ importStats, onClose }: DataIntegrityReportProps) {
  if (!importStats || (importStats.duplicates === 0 && importStats.skipped === 0)) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-950/20">
            <RefreshCcw className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-amber-200 leading-tight">Data Integrity Report</h3>
            <p className="text-amber-500/60 text-sm font-medium">Automatic system cleanup during import session</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2.5 hover:bg-amber-500/10 rounded-2xl transition-all text-amber-500 hover:scale-105 active:scale-95"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {importStats.duplicates > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-500/80">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span>Duplicates Merged ({importStats.duplicates})</span>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">HOF_ID Conflict</span>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
               {importStats.duplicateEntries.map(entry => (
                 <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-2xl border border-slate-800 group hover:border-amber-500/30 transition-all duration-300">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">HOF ID</span>
                     <span className="text-sm font-mono text-amber-500 font-bold">{entry.id}</span>
                   </div>
                   <div className="h-6 w-px bg-slate-800" />
                   <div className="flex flex-col overflow-hidden">
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Full Name</span>
                     <span className="text-sm text-slate-200 font-medium truncate">{entry.name}</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {importStats.skipped > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-rose-500/80">
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <span>Skipped Records ({importStats.skipped})</span>
              </div>
              <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold border border-rose-500/20">Empty HOF_ID</span>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
               {importStats.skippedEntries.map((entry, idx) => (
                 <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-2xl border border-slate-800 group hover:border-rose-500/30 transition-all duration-300">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SN</span>
                     <span className="text-sm font-mono text-rose-500 font-bold">{entry.sn}</span>
                   </div>
                   <div className="h-6 w-px bg-slate-800" />
                   <div className="flex flex-col overflow-hidden">
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Full Name</span>
                     <span className="text-sm text-slate-200 font-medium truncate">{entry.name}</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
