import React from "react";
import { Edit2, Check, X } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown";

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
  uniqueColumnValues
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-x-auto max-h-[600px] custom-scrollbar" ref={dropdownRef}>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="p-3 font-semibold min-w-[160px] align-top"
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
        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
          {filteredData.map((row) => {
            const originalIndex = row.__originalIndex;
            
            return (
              <tr
                key={originalIndex}
                className="hover:bg-slate-800/60 transition-colors group"
              >
                {headers.map((header) => {
                  const isEditing =
                    editingCell?.originalIndex === originalIndex &&
                    editingCell?.header === header;
                  const val = row[header];

                  return (
                    <td
                      key={header}
                      className="p-3 border-r border-slate-800/40 relative min-w-[160px]"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              handleCellEditSave(originalIndex, header)
                            }
                            className="w-full bg-slate-950 border border-blue-500 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-medium shadow-inner"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleCellEditSave(originalIndex, header)
                            }
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors shadow-md z-10 relative"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCell(null)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors shadow-md border border-slate-700 z-10 relative"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="flex justify-between items-center gap-2 group-hover:pr-8 cursor-pointer h-full min-h-[20px]" 
                          onDoubleClick={() => handleCellEditStart(originalIndex, header, val)}
                          onClick={(e) => {
                            setActiveDropdown(null);
                          }}
                        >
                          <span className="text-slate-300 font-medium truncate">
                            {String(val ?? "")}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCellEditStart(originalIndex, header, val);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all absolute right-2 top-1/2 -translate-y-1/2"
                            title="Edit cell"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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
  );
}
