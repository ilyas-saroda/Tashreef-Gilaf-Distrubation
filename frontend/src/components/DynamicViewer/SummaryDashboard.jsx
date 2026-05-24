import React from "react";
import { IndianRupee, Wallet } from "lucide-react";
import { convertNumberToWords } from "./useDynamicEngine";

export function SummaryDashboard({ amountHeader, filteredAmount, totalAmount }) {
  if (!amountHeader) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <IndianRupee className="w-32 h-32" />
      </div>
      <div className="flex items-start md:items-center gap-4 z-10 w-full md:w-auto">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-inner mt-1 md:mt-0 flex-shrink-0">
          <IndianRupee className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Filtered Amount</p>
          <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(filteredAmount)}
          </p>
          <p className="text-[11px] text-slate-500 italic mt-0.5 font-medium leading-tight">
            {convertNumberToWords(filteredAmount)}
          </p>
        </div>
      </div>
      
      <div className="h-px w-full md:h-16 md:w-px bg-white z-10" />
      
      <div className="flex items-start md:items-center gap-4 z-10 w-full md:w-auto md:justify-end">
        <div className="p-3 bg-blue-500/10 border border-blue-300/20 rounded-xl shadow-inner mt-1 md:mt-0 md:order-last flex-shrink-0">
          <Wallet className="w-6 h-6 text-blue-600" />
        </div>
        <div className="text-left md:text-right w-full">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Overall Total</p>
          <p className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalAmount)}
          </p>
          <p className="text-[11px] text-slate-500 italic mt-0.5 font-medium leading-tight">
            {convertNumberToWords(totalAmount)}
          </p>
        </div>
      </div>
    </div>
  );
}
