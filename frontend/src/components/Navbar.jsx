import React from 'react';
import { FileSpreadsheet, RefreshCcw, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function Navbar({
  isSyncing,
  supabaseStatus,
  errorMessage,
  onRefresh,
  onResetClick,
  showResetButton,
  onViewToggle,
  currentView
}) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Rumal<span className="text-emerald-500">Track</span>
          </h1>
          <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded bg-white border border-slate-200">
            <button 
              onClick={onRefresh}
              disabled={isSyncing}
              className="flex items-center gap-1.5 hover:bg-slate-100 px-1 rounded transition-colors group"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" /> : <RefreshCcw className="w-3 h-3 text-emerald-500 group-hover:rotate-180 transition-transform duration-500" />}
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Refresh</span>
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-1" />
            {supabaseStatus === 'connected' ? (
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Sync Active</span>
              </div>
            ) : !isSupabaseConfigured ? (
              <div className="flex items-center gap-1.5 opacity-60" title="Set Supabase keys in Settings to enable Cloud Sync">
                <CloudOff className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Local Only</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5" title={errorMessage || 'Connection failed'}>
                <CloudOff className="w-3 h-3 text-rose-400" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400">
                    Sync Error
                  </span>
                  <button 
                    onClick={onRefresh}
                    className="p-1 hover:bg-rose-400/10 rounded text-rose-400 transition-colors"
                    title="Retry Connection"
                  >
                    <RefreshCcw className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onViewToggle}
            className="px-3 py-1.5 text-xs font-bold text-emerald-100 hover:text-emerald-400 hover:bg-emerald-400/10 rounded border border-emerald-500/30 transition-all mr-2 shadow-sm"
          >
            {currentView === 'dynamic' ? 'Back to Distribution' : 'Open Dynamic Offline Viewer'}
          </button>
          {showResetButton && (
            <button 
              onClick={onResetClick}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
              title="Clear Data"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          )}
          <div className="h-4 w-[1px] bg-white" />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-500">Organization Unit</p>
            <p className="text-sm font-bold text-white leading-none">MNC Distribution Dept.</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
