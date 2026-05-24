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
      className="mb-8 p-6 mnc-card-global"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          Recently Updated
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-[11px] text-slate-500 font-mono">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </div>
          <button 
            onClick={onClearAllRecent}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all border border-rose-200"
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
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 group hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[11px] font-mono text-emerald-600 font-bold">{item.HOF_ID}</span>
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase",
                  item.Status === 'Given' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
                )}>
                  {item.Status}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissRecent(item.HOF_ID);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition-all"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-[15px] leading-tight font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">{item.Full_Name}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-slate-500 truncate">
              {item.SN && <span>SN: {item.SN}</span>}
              {item.SN && item.AccNo && <span>•</span>}
              {item.AccNo && <span>Acc: {item.AccNo}</span>}
            </div>
            <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-500 font-medium">
              <span>{item.Update_Day?.substring(0,3)} • {item.Update_Time}</span>
              {item.Received_By && <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"><User className="w-2.5 h-2.5" /> {item.Received_By}</span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
