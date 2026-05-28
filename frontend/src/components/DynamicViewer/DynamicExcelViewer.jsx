import React from "react";
import { FileSpreadsheet, Search, X, ArrowUpRight, RotateCcw } from "lucide-react";
import { useDynamicEngine } from "./useDynamicEngine";
import { SummaryDashboard } from "./SummaryDashboard";
import { TableRenderer } from "./TableRenderer";

export function DynamicExcelViewer() {
  const engine = useDynamicEngine();

  if (engine.loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500 text-xs tracking-wider">
        🔄 Connecting to local companion and loading dynamic backup file...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Sheet Controller Dashboard Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <FileSpreadsheet className="w-32 h-32" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Dynamic Offline Excel
              Sheet Viewer
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              State-of-the-art client-side data warehouse engine with partitioning and caching.
            </p>
          </div>

          <label className="mnc-btn-primary font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-md z-10">
            <ArrowUpRight className="w-4 h-4" /> Import Excel Sheet
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
        <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            No active spreadsheet file loaded.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Import any sheet to dynamically construct the data warehouse view.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Automatic Amount Tracking Dashboard */}
          <SummaryDashboard 
            amountHeader={engine.amountHeader}
            filteredAmount={engine.filteredAmount}
            totalAmount={engine.totalAmount}
          />

          {/* Sheet Selector Tabs Bar */}
          {engine.sheets && engine.sheets.length > 0 && (
            <div className="flex overflow-x-auto hide-scrollbar gap-2 py-2">
              {engine.sheets.map(sheet => (
                <button
                  key={sheet}
                  onClick={() => engine.setActiveSheet(sheet)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    engine.activeSheet === sheet
                      ? "mnc-btn-primary shadow-md"
                      : "bg-white text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}

          {/* User Interaction & Reset Filters Container */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Global text search across cells..."
                  value={engine.searchTerm}
                  onChange={(e) => engine.setSearchTerm(e.target.value)}
                  className="mnc-input-global pl-9 pr-4 py-2 w-full"
                />
                {engine.searchTerm && (
                  <button
                    onClick={() => engine.setSearchTerm("")}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              {engine.hasActiveFilters && (
                <button
                  onClick={engine.handleResetFilters}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all w-full md:w-auto"
                  title="Clear all active filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
            
            <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Showing{" "}
              <span className="text-blue-600 font-bold">
                {engine.filteredData.length}
              </span>{" "}
              of {engine.data.length} rows
            </div>
          </div>

          {/* Core Table Viewport (Cascading Views) */}
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
