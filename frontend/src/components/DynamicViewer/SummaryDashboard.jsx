import React from "react";
import { IndianRupee, Wallet, TrendingUp } from "lucide-react";
import { convertNumberToWords } from "./useDynamicEngine";

export function SummaryDashboard({
  amountHeader,
  filteredAmount,
  totalAmount,
}) {
  if (!amountHeader) return null;

  const pct =
    totalAmount > 0 ? Math.round((filteredAmount / totalAmount) * 100) : 0;

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* ── Filtered Amount Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 border border-emerald-700/30 shadow-xl p-5">
        {/* Radial glow */}
        <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-emerald-400/15 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-emerald-400/70 text-[10px] font-semibold uppercase tracking-widest mb-2">
              Filtered Amount
            </p>
            <p className="text-3xl font-black text-white font-mono tracking-tight leading-none">
              {fmt(filteredAmount)}
            </p>
            <p className="text-emerald-300/60 text-[11px] italic mt-1.5 font-medium leading-snug max-w-[200px]">
              {convertNumberToWords(filteredAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/20 shadow-inner flex-shrink-0">
            <IndianRupee className="w-5 h-5 text-emerald-300" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-emerald-400/60 text-[10px] font-medium">
              Share of total
            </span>
            <span className="text-emerald-300 text-[10px] font-bold tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-emerald-950/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Overall Total Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        {/* Subtle background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="pointer-events-none absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-blue-500/8 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Overall Total
            </p>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight leading-none">
              {fmt(totalAmount)}
            </p>
            <p className="text-slate-400 text-[11px] italic mt-1.5 font-medium leading-snug max-w-[200px]">
              {convertNumberToWords(totalAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 shadow-inner flex-shrink-0">
            <Wallet className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        {/* Divider + meta */}
        <div className="relative z-10 mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-medium">
            Unfiltered baseline
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold tabular-nums">
            100%
          </span>
        </div>
      </div>
    </div>
  );
}
