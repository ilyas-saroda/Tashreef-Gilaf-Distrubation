import React from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

export function FilterDropdown({
  header,
  activeDropdown,
  setActiveDropdown,
  columnFilters,
  setColumnFilters,
  uniqueColumnValues,
}) {
  const hasFilter = !!columnFilters[header];
  const isOpen = activeDropdown === header;

  return (
    <div className="flex flex-col gap-1.5 relative">
      {/* ── Column label row ── */}
      <div
        className="flex justify-between items-center gap-2 cursor-pointer group select-none"
        onClick={() => setActiveDropdown(isOpen ? null : header)}
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-widest truncate transition-colors ${
            hasFilter
              ? "text-emerald-600"
              : "text-slate-500 group-hover:text-slate-700"
          }`}
        >
          {header}
        </span>
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 transition-all duration-200 ${
            hasFilter
              ? "text-emerald-500"
              : "text-slate-400 group-hover:text-slate-600"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* ── Filter input ── */}
      <div className="relative group/input">
        <SlidersHorizontal
          className={`absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 transition-colors ${
            hasFilter ? "text-emerald-500" : "text-slate-400"
          }`}
        />
        <input
          type="text"
          placeholder={`Filter…`}
          value={columnFilters[header] || ""}
          onChange={(e) => {
            setColumnFilters({ ...columnFilters, [header]: e.target.value });
            setActiveDropdown(header);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(header);
          }}
          className={`w-full pl-6 pr-6 py-1.5 text-[11px] rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            hasFilter
              ? "border-emerald-400/60 bg-emerald-50/60 text-emerald-800 placeholder:text-emerald-400"
              : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
          }`}
        />
        {hasFilter && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setColumnFilters({ ...columnFilters, [header]: "" });
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* ── Suggestion dropdown ── */}
      {isOpen && uniqueColumnValues[header]?.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-200/80 z-50 max-h-44 overflow-y-auto ring-1 ring-black/[0.04]">
          <ul className="py-1">
            {uniqueColumnValues[header]
              .filter(
                (val) =>
                  !columnFilters[header] ||
                  val
                    .toLowerCase()
                    .includes(columnFilters[header].toLowerCase()),
              )
              .map((val, i) => (
                <li
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnFilters({ ...columnFilters, [header]: val });
                    setActiveDropdown(null);
                  }}
                  className="px-3 py-1.5 text-[11px] text-slate-700 cursor-pointer truncate transition-colors hover:bg-emerald-50 hover:text-emerald-800 border-b border-slate-100/80 last:border-0"
                >
                  {val}
                </li>
              ))}
            {uniqueColumnValues[header].filter(
              (val) =>
                !columnFilters[header] ||
                val.toLowerCase().includes(columnFilters[header].toLowerCase()),
            ).length === 0 && (
              <li className="px-3 py-3 text-slate-400 text-[11px] text-center">
                No matches found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
