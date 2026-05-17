import React from "react";
import { ChevronDown, Filter, X } from "lucide-react";

export function FilterDropdown({
  header,
  activeDropdown,
  setActiveDropdown,
  columnFilters,
  setColumnFilters,
  uniqueColumnValues
}) {
  return (
    <div className="flex flex-col gap-1.5 relative">
      <div 
        className="flex justify-between items-center group cursor-pointer"
        onClick={() => setActiveDropdown(activeDropdown === header ? null : header)}
      >
        <span className="text-slate-300 tracking-wider uppercase text-[10px] font-bold select-none">
          {header}
        </span>
        <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="relative">
        <Filter className="absolute left-2 top-1.5 w-3 h-3 text-slate-600" />
        <input
          type="text"
          placeholder={`Filter ${header}...`}
          value={columnFilters[header] || ""}
          onChange={(e) => {
            setColumnFilters({
              ...columnFilters,
              [header]: e.target.value,
            });
            setActiveDropdown(header);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(header);
          }}
          className="w-full bg-slate-900 border border-slate-800 rounded pl-7 pr-6 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
        />
        {columnFilters[header] && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setColumnFilters({ ...columnFilters, [header]: "" });
            }}
            className="absolute right-1.5 top-1.5 p-0.5 text-slate-500 hover:text-slate-300 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Smart Dynamic Suggestion Dropdown (Cascading from Cache Layer) */}
      {activeDropdown === header && uniqueColumnValues[header]?.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
          <ul className="py-1">
            {uniqueColumnValues[header]
              .filter(val => !columnFilters[header] || val.toLowerCase().includes(columnFilters[header].toLowerCase()))
              .map((val, i) => (
              <li
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setColumnFilters({
                    ...columnFilters,
                    [header]: val,
                  });
                  setActiveDropdown(null);
                }}
                className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer text-slate-300 text-[11px] truncate transition-colors border-b border-slate-700/50 last:border-0"
              >
                {val}
              </li>
            ))}
            {uniqueColumnValues[header].filter(val => !columnFilters[header] || val.toLowerCase().includes(columnFilters[header].toLowerCase())).length === 0 && (
              <li className="px-3 py-3 text-slate-500 text-[11px] text-center italic">
                No matches found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
