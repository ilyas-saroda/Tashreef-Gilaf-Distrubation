import React from "react";
import {
  FileSpreadsheet,
  Search,
  X,
  Upload,
  RotateCcw,
  Layers,
} from "lucide-react";
import { useDynamicEngine } from "./useDynamicEngine";
import { SummaryDashboard } from "./SummaryDashboard";
import { TableRenderer } from "./TableRenderer";

export function DynamicExcelViewer() {
  const engine = useDynamicEngine();

  if (engine.loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-xs tracking-widest uppercase font-medium">
          Initialising data warehouse…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-[system-ui]">
      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/[0.06] shadow-2xl">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blob */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 px-7 py-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 shadow-inner">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                Dynamic Excel Viewer
              </h1>
              <p className="text-slate-400 text-xs mt-0.5 font-normal">
                Client-side data warehouse engine with partitioning &amp;
                caching
              </p>
            </div>
          </div>

          <label className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer select-none overflow-hidden bg-emerald-500 hover:bg-emerald-400 transition-colors duration-200 shadow-lg shadow-emerald-500/20">
            <Upload className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-semibold tracking-wide">
              Import Sheet
            </span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={engine.handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {engine.data.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-20 text-center">
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
            <FileSpreadsheet className="w-8 h-8 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">
              No spreadsheet loaded
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Import an <span className="font-medium">.xlsx</span> or{" "}
              <span className="font-medium">.xls</span> file to build the data
              warehouse view
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── Summary Cards ── */}
          <SummaryDashboard
            amountHeader={engine.amountHeader}
            filteredAmount={engine.filteredAmount}
            totalAmount={engine.totalAmount}
          />

          {/* ── Sheet Selector ── */}
          {engine.sheets?.length > 0 && (
            <div className="flex overflow-x-auto hide-scrollbar gap-1.5 py-0.5">
              {engine.sheets.map((sheet) => (
                <button
                  key={sheet}
                  onClick={() => engine.setActiveSheet(sheet)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-150 border ${
                    engine.activeSheet === sheet
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}

          {/* ── Search & Filter Bar ── */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
            <div className="flex flex-col md:flex-row gap-2.5 items-center w-full md:w-auto">
              {/* Search input */}
              <div className="relative w-full md:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search across all cells…"
                  value={engine.searchTerm}
                  onChange={(e) => engine.setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition-all duration-150"
                />
                {engine.searchTerm && (
                  <button
                    onClick={() => engine.setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Reset filters */}
              {engine.hasActiveFilters && (
                <button
                  onClick={engine.handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all duration-150 whitespace-nowrap w-full md:w-auto justify-center"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}
            </div>

            {/* Row counter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs tabular-nums">
                {engine.filteredData.length}
              </span>
              <span>of</span>
              <span className="font-semibold text-slate-600">
                {engine.data.length}
              </span>
              <span>rows</span>
            </div>
          </div>

          {/* ── Table ── */}
          <TableRenderer
            headers={engine.headers}
            filteredData={engine.filteredData}
            editingCell={engine.editingCell}
            setEditingCell={engine.setEditingCell}
            editValue={engine.editValue}
            setEditValue={engine.setEditValue}
            handleCellEditStart={engine.handleCellEditStart}
            handleCellEditSave={engine.handleCellEditSave}
            activeDropdown={engine.activeDropdown}
            setActiveDropdown={engine.setActiveDropdown}
            dropdownRef={engine.dropdownRef}
            columnFilters={engine.columnFilters}
            setColumnFilters={engine.setColumnFilters}
            uniqueColumnValues={engine.uniqueColumnValues}
          />
        </div>
      )}
    </div>
  );
}
