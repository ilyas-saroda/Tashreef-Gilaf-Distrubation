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
    <div className="mnc-card-global overflow-x-auto max-h-[600px] custom-scrollbar" ref={dropdownRef}>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-white text-slate-500 sticky top-0 z-10 border-b border-slate-200">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="mnc-table-th-global p-3 font-semibold min-w-[160px] align-top"
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
        <tbody className="divide-y divide-slate-800/60 bg-white/40">
          {filteredData.map((row) => {
            const originalIndex = row.__originalIndex;
            
            return (
              <tr
                key={originalIndex}
                className="hover:bg-slate-50 transition-colors group"
              >
                {headers.map((header) => {
                  const isEditing =
                    editingCell?.originalIndex === originalIndex &&
                    editingCell?.header === header;
                  const val = row[header];

                  return (
                    <td
                      key={header}
                      className="p-3 border-r border-slate-200/40 relative min-w-[160px]"
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
                            className="mnc-input-global w-full px-2 py-1.5 text-xs focus:outline-none font-medium"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleCellEditSave(originalIndex, header)
                            }
                            className="p-1.5 mnc-btn-primary rounded transition-colors shadow-md z-10 relative"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCell(null)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded transition-colors shadow-md border border-slate-200 z-10 relative"
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
                          <span className="text-slate-900 font-medium truncate">
                            {String(val ?? "")}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCellEditStart(originalIndex, header, val);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50/10 rounded transition-all absolute right-2 top-1/2 -translate-y-1/2"
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
