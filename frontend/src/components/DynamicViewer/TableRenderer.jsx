import React from "react";
import {
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { FilterDropdown } from "./FilterDropdown";

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export function TableRenderer({
  headers,
  filteredData,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  handleCellEditStart,
  handleCellEditSave,
  activeDropdown,
  setActiveDropdown,
  dropdownRef,
  columnFilters,
  setColumnFilters,
  uniqueColumnValues,
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);

  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  React.useEffect(() => {
    setPage(1);
  }, [filteredData, pageSize]);

  const visibleRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const goToPreviousPage = () => setPage((c) => Math.max(1, c - 1));
  const goToNextPage = () => setPage((c) => Math.min(totalPages, c + 1));
  const goToFirst = () => setPage(1);
  const goToLast = () => setPage(totalPages);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
      ref={dropdownRef}
    >
      {/* ── Pagination / controls bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/70">
        {/* Row count */}
        <div className="text-xs text-slate-500 font-medium">
          Showing{" "}
          <span className="font-bold text-slate-800 tabular-nums">
            {visibleRows.length}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-800 tabular-nums">
            {totalRows}
          </span>{" "}
          rows
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 cursor-pointer transition-all"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 rotate-90" />
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToFirst}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={goToPreviousPage}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold tabular-nums min-w-[64px] text-center shadow-sm">
              {page}{" "}
              <span className="text-slate-400 font-normal">/ {totalPages}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={goToLast}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
        <table className="w-full border-collapse text-left text-xs">
          {/* ── thead ── */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              {headers.map((header, idx) => (
                <th
                  key={header}
                  className={`p-3 min-w-[160px] align-top border-r border-slate-100 last:border-r-0 ${
                    idx === 0 ? "rounded-tl-none" : ""
                  }`}
                >
                  <FilterDropdown
                    header={header}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    uniqueColumnValues={uniqueColumnValues}
                  />
                </th>
              ))}
            </tr>
          </thead>

          {/* ── tbody ── */}
          <tbody>
            {visibleRows.map((row, rowIdx) => {
              const originalIndex = row.__originalIndex;
              const isEven = rowIdx % 2 === 0;

              return (
                <tr
                  key={originalIndex}
                  className={`group transition-colors duration-100 border-b border-slate-100 last:border-0 ${
                    isEven ? "bg-white" : "bg-slate-50/40"
                  } hover:bg-emerald-50/40`}
                >
                  {headers.map((header) => {
                    const isEditing =
                      editingCell?.originalIndex === originalIndex &&
                      editingCell?.header === header;
                    const val = row[header];

                    return (
                      <td
                        key={header}
                        className="relative p-0 border-r border-slate-100 last:border-r-0 min-w-[160px]"
                      >
                        {isEditing ? (
                          /* ── Edit mode ── */
                          <div className="flex items-center gap-1.5 p-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleCellEditSave(originalIndex, header);
                                else if (e.key === "Escape")
                                  setEditingCell(null);
                              }}
                              onBlur={() =>
                                handleCellEditSave(originalIndex, header)
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-400 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 font-medium shadow-sm"
                              autoFocus
                            />
                            <button
                              onClick={() =>
                                handleCellEditSave(originalIndex, header)
                              }
                              className="flex-shrink-0 p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="flex-shrink-0 p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          /* ── Display mode ── */
                          <div
                            className="flex items-center justify-between px-3 py-2.5 cursor-pointer min-h-[38px] gap-2"
                            onDoubleClick={() =>
                              handleCellEditStart(originalIndex, header, val)
                            }
                            onClick={() => setActiveDropdown(null)}
                          >
                            <span className="text-slate-700 font-normal whitespace-normal break-words leading-snug text-[12px]">
                              {String(val ?? "")}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellEditStart(originalIndex, header, val);
                              }}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 transition-all duration-150"
                              title="Edit cell"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
