import React from 'react';
import { motion } from 'motion/react';
import { Trash2, X, User } from 'lucide-react';
import { cn } from '../lib/utils';

export function RecentUpdates({
  recentUpdates,
  lastRefreshed,
  onClearAllRecent,
  onDismissRecent,
  onCardClick,
}) {
  if (recentUpdates.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 rounded-3xl bg-slate-900 border border-slate-800"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          Recently Updated
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-slate-500 font-mono">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </div>
          <button 
            onClick={onClearAllRecent}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {recentUpdates.map((item) => (
          <div 
            key={item.HOF_ID} 
            onClick={() => onCardClick(item.HOF_ID)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 group hover:border-emerald-500/50 transition-all cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-mono text-emerald-500 font-bold">{item.HOF_ID}</span>
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase",
                  item.Status === 'Given' ? "border-emerald-500/20 text-emerald-500" : "border-amber-500/20 text-amber-500"
                )}>
                  {item.Status}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissRecent(item.HOF_ID);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded transition-all"
                  title="Dismiss"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{item.Full_Name}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-slate-400/60 truncate">
              {item.SN && <span>SN: {item.SN}</span>}
              {item.SN && item.AccNo && <span>•</span>}
              {item.AccNo && <span>Acc: {item.AccNo}</span>}
            </div>
            <div className="flex items-center justify-between mt-2 text-[8px] text-slate-500 font-medium">
              <span>{item.Update_Day?.substring(0,3)} • {item.Update_Time}</span>
              {item.Received_By && <span className="text-emerald-500/60 flex items-center gap-1"><User className="w-2 h-2" /> {item.Received_By}</span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
