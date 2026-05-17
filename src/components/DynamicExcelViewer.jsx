import React from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Search,
  Filter,
  Edit2,
  Check,
  X,
  ArrowUpRight,
} from "lucide-react";

export function DynamicExcelViewer() {
  const [data, setData] = React.useState([]);
  const [headers, setHeaders] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState({});
  const [editingCell, setEditingCell] = React.useState(null);
  const [editValue, setEditValue] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // Load from local backend server on mount (Fixes data loss on refresh)
  React.useEffect(() => {
    fetchDynamicData();
  }, []);

  const fetchDynamicData = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/load-dynamic");
      const result = await res.json();
      if (Array.isArray(result) && result.length > 0) {
        setData(result);
        setHeaders(Object.keys(result[0]));
      }
    } catch (e) {
      console.error("Failed to load dynamic backup file:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveUpdate = async (updatedData) => {
    try {
      await fetch("http://localhost:5000/api/save-dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedData }),
      });
    } catch (e) {
      console.warn("Could not save to dynamic server:", e);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      // Auto-treats first row as column keys
      const jsonData = XLSX.utils.sheet_to_json(ws);

      if (jsonData.length > 0) {
        const detectedHeaders = Object.keys(jsonData[0]);
        setData(jsonData);
        setHeaders(detectedHeaders);
        setColumnFilters({});
        await saveUpdate(jsonData);
      } else {
        alert("This Excel sheet seems to be empty.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCellEditStart = (rowIndex, header, currentValue) => {
    setEditingCell({ rowIndex, header });
    setEditValue(String(currentValue ?? ""));
  };

  const handleCellEditSave = async (rowIndex, header) => {
    const updated = [...data];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [header]: editValue,
    };
    setData(updated);
    setEditingCell(null);
    await saveUpdate(updated);
  };

  // Dynamic Multi-column Filtering Engine
  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      const matchGlobal = headers.some((header) =>
        String(row[header] ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
      if (!matchGlobal) return false;

      return Object.keys(columnFilters).every((header) => {
        const filterVal = columnFilters[header];
        if (!filterVal) return true;
        return String(row[header] ?? "")
          .toLowerCase()
          .includes(filterVal.toLowerCase());
      });
    });
  }, [data, headers, searchTerm, columnFilters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400 text-xs tracking-wider">
        🔄 Connecting to local companion and loading dynamic backup file...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Sheet Controller Dashboard Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <FileSpreadsheet className="w-32 h-32" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Dynamic Offline Excel
              Sheet Viewer
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              No predefined structure required. First row becomes your layout.
              100% data persistent on refresh.
            </p>
          </div>

          <label className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-md">
            <ArrowUpRight className="w-4 h-4" /> Import Excel Sheet
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            No active spreadsheet file loaded.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Import any sheet to dynamically construct table structure, global
            filters, and cells.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters Management Container */}
          <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Global text search across cells..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Showing{" "}
              <span className="text-blue-400 font-bold">
                {filteredData.length}
              </span>{" "}
              of {data.length} rows
            </div>
          </div>

          {/* Core Table Viewport */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-x-auto max-h-[600px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="p-3 font-semibold min-w-[160px]"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-slate-300 tracking-wider uppercase text-[10px] font-bold">
                          {header}
                        </span>
                        <div className="relative">
                          <Filter className="absolute left-2 top-1.5 w-3 h-3 text-slate-600" />
                          <input
                            type="text"
                            placeholder={`Filter ${header}...`}
                            value={columnFilters[header] || ""}
                            onChange={(e) =>
                              setColumnFilters({
                                ...columnFilters,
                                [header]: e.target.value,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded pl-6 pr-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {filteredData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {headers.map((header) => {
                      const isEditing =
                        editingCell?.rowIndex === rowIndex &&
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
                                  handleCellEditSave(rowIndex, header)
                                }
                                className="w-full bg-slate-950 border border-blue-500 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none font-medium"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleCellEditSave(rowIndex, header)
                                }
                                className="p-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center gap-2 group-hover:pr-6">
                              <span className="text-slate-300 font-medium truncate">
                                {String(val ?? "")}
                              </span>
                              <button
                                onClick={() =>
                                  handleCellEditStart(rowIndex, header, val)
                                }
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-400 rounded transition-all absolute right-2 top-2.5"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
