import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Search,
  Filter,
  Edit2,
  Check,
  X,
  ArrowUpRight,
  ChevronDown,
  Wallet,
  IndianRupee,
  RotateCcw
} from "lucide-react";

// Hook for debouncing fast typing
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Convert number to Indian words
function convertNumberToWords(num) {
  if (!num || isNaN(num) || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];
  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };
  return convert(Math.floor(num)).trim() + " Rupees Only";
}

export function DynamicExcelViewer() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { originalIndex, header }
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);

  // ADVANCED CACHE LAYER: Memoized Cache Map for instant O(0) sub-second re-renders
  const filterCacheRef = useRef(new Map());

  // Active dropdown state for column filters
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Debounced states for ultra-fast UI rendering without freezing
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedColumnFilters = useDebounce(columnFilters, 300);

  // Load from local backend server on mount
  useEffect(() => {
    fetchDynamicData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    // INVALIDATE CACHE: Clear the cache map completely whenever data changes
    filterCacheRef.current.clear();
    
    // Clean data before sending to server (remove warehouse meta-properties)
    const cleanData = updatedData.map(row => {
      const { __originalIndex, __lowerRow, __fullText, ...cleanRow } = row;
      return cleanRow;
    });

    try {
      await fetch("http://localhost:5000/api/save-dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: cleanData }),
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

      const jsonData = XLSX.utils.sheet_to_json(ws);

      if (jsonData.length > 0) {
        filterCacheRef.current.clear(); // Clear cache for new data
        const detectedHeaders = Object.keys(jsonData[0]);
        setData(jsonData);
        setHeaders(detectedHeaders);
        setColumnFilters({});
        setSearchTerm("");
        await saveUpdate(jsonData);
      } else {
        alert("This Excel sheet seems to be empty.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleCellEditStart = (originalIndex, header, currentValue) => {
    setEditingCell({ originalIndex, header });
    setEditValue(String(currentValue ?? ""));
  };

  const handleCellEditSave = async (originalIndex, header) => {
    const updated = [...data];
    updated[originalIndex] = {
      ...updated[originalIndex],
      [header]: editValue,
    };
    setData(updated);
    setEditingCell(null);
    await saveUpdate(updated);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setColumnFilters({});
    setActiveDropdown(null);
  };

  const hasActiveFilters = searchTerm !== "" || Object.values(columnFilters).some(v => v !== "");

  // 1. CLIENT-SIDE DATA WAREHOUSE: PARTITIONING & INDEXING (O(1) Lookups)
  const warehouse = useMemo(() => {
    const partitions = {}; // Localized physical memory buckets for exact matches
    const indexes = {};    // Fast partial text search indexes
    
    headers.forEach(h => {
      partitions[h] = new Map(); // Value -> Set of row IDs (Exact Match Bucket)
      indexes[h] = new Map();    // Lowercase Substring Value -> Set of row IDs
    });

    const enhancedData = data.map((row, idx) => {
      const lowerRow = {};
      let fullText = "";
      
      headers.forEach(h => {
        const val = row[h] != null ? String(row[h]) : "";
        const lowerVal = val.toLowerCase();
        lowerRow[h] = lowerVal;
        fullText += lowerVal + " ";

        // Build Index (For substring searches)
        if (!indexes[h].has(lowerVal)) {
          indexes[h].set(lowerVal, new Set());
        }
        indexes[h].get(lowerVal).add(idx);

        // Build Partition Bucket (For fast distinct dropdown lookups and exact grouping)
        if (!partitions[h].has(val)) {
          partitions[h].set(val, new Set());
        }
        partitions[h].get(val).add(idx);
      });

      return { 
        ...row, 
        __originalIndex: idx, 
        __lowerRow: lowerRow,
        __fullText: fullText
      };
    });
    
    // Invalidate stale views when base warehouse rebuilds
    filterCacheRef.current.clear();
    
    return { enhancedData, partitions, indexes };
  }, [data, headers]);

  // 2. CASCADING INTERSECTION VIEWS (Multi-Column Cumulative Engine)
  const filteredIndices = useMemo(() => {
    const { enhancedData, indexes } = warehouse;
    const globalSearchLower = debouncedSearchTerm.toLowerCase();
    
    const activeFilters = Object.entries(debouncedColumnFilters)
      .filter(([_, val]) => val)
      .map(([key, val]) => [key, val.toLowerCase()]);

    // Check Cache Layer First
    const cacheKey = "view:" + JSON.stringify({ g: globalSearchLower, f: activeFilters });
    if (filterCacheRef.current.has(cacheKey)) {
      return filterCacheRef.current.get(cacheKey);
    }

    let subsetIndices = null; // null = entire dataset

    // A. Intersect Column Filters using Map Indexes
    if (activeFilters.length > 0) {
      for (let i = 0; i < activeFilters.length; i++) {
        const [header, filterVal] = activeFilters[i];
        const colIndexMap = indexes[header];
        
        let matchingForThisCol = new Set();
        // O(N_keys) scan of unique keys, avoiding O(N_rows) scan
        for (const [key, indicesSet] of colIndexMap.entries()) {
          if (key.includes(filterVal)) {
            for (const idx of indicesSet) matchingForThisCol.add(idx);
          }
        }

        // Apply Cumulative Intersection
        if (subsetIndices === null) {
          subsetIndices = matchingForThisCol;
        } else {
          const intersection = new Set();
          for (const idx of matchingForThisCol) {
            if (subsetIndices.has(idx)) {
              intersection.add(idx);
            }
          }
          subsetIndices = intersection;
        }

        if (subsetIndices.size === 0) break; // Fast fail if subset is empty
      }
    }

    // B. Intersect Global Search onto the active View
    if (globalSearchLower) {
      const matchGlobal = new Set();
      const indicesToSearch = subsetIndices !== null ? Array.from(subsetIndices) : enhancedData.map(r => r.__originalIndex);
      
      for (let i = 0; i < indicesToSearch.length; i++) {
        const idx = indicesToSearch[i];
        if (enhancedData[idx].__fullText.includes(globalSearchLower)) {
          matchGlobal.add(idx);
        }
      }
      subsetIndices = matchGlobal;
    }

    // Save final View to Cache
    const finalArray = subsetIndices !== null ? Array.from(subsetIndices) : enhancedData.map(r => r.__originalIndex);
    filterCacheRef.current.set(cacheKey, finalArray);
    return finalArray;
  }, [warehouse, debouncedSearchTerm, debouncedColumnFilters]);

  // Map active View indices back to physical row objects
  const filteredData = useMemo(() => {
    return filteredIndices.map(idx => warehouse.enhancedData[idx]);
  }, [filteredIndices, warehouse.enhancedData]);

  // 3. DYNAMIC CASCADING SUGGESTIONS (Populate dropdowns natively from intersected views)
  const uniqueColumnValues = useMemo(() => {
    const { enhancedData, indexes } = warehouse;
    const uniqueVals = {};
    const globalSearchLower = debouncedSearchTerm.toLowerCase();
    
    const activeFilters = Object.entries(debouncedColumnFilters)
      .filter(([_, val]) => val)
      .map(([key, val]) => [key, val.toLowerCase()]);

    headers.forEach((header) => {
      // Calculate intersection WITHOUT this column's own filter
      const otherFilters = activeFilters.filter(([key]) => key !== header);
      const cacheKey = "sugg:" + JSON.stringify({ g: globalSearchLower, f: otherFilters, target: header });
      
      if (filterCacheRef.current.has(cacheKey)) {
        uniqueVals[header] = filterCacheRef.current.get(cacheKey);
        return;
      }

      let subsetIndices = null;
      if (otherFilters.length > 0) {
        for (let i = 0; i < otherFilters.length; i++) {
          const [oHeader, oFilterVal] = otherFilters[i];
          const colIndexMap = indexes[oHeader];
          let matchingForThisCol = new Set();
          for (const [key, indicesSet] of colIndexMap.entries()) {
            if (key.includes(oFilterVal)) {
              for (const idx of indicesSet) matchingForThisCol.add(idx);
            }
          }
          if (subsetIndices === null) subsetIndices = matchingForThisCol;
          else {
            const intersection = new Set();
            for (const idx of matchingForThisCol) {
              if (subsetIndices.has(idx)) intersection.add(idx);
            }
            subsetIndices = intersection;
          }
          if (subsetIndices.size === 0) break;
        }
      }

      if (globalSearchLower) {
        const matchGlobal = new Set();
        const indicesToSearch = subsetIndices !== null ? Array.from(subsetIndices) : enhancedData.map(r => r.__originalIndex);
        for (let i = 0; i < indicesToSearch.length; i++) {
          const idx = indicesToSearch[i];
          if (enhancedData[idx].__fullText.includes(globalSearchLower)) {
            matchGlobal.add(idx);
          }
        }
        subsetIndices = matchGlobal;
      }

      // Collect available unique values for the dropdown based on the subset
      const indicesToUse = subsetIndices !== null ? Array.from(subsetIndices) : enhancedData.map(r => r.__originalIndex);
      const vals = new Set();
      for (let i = 0; i < indicesToUse.length; i++) {
        const val = enhancedData[indicesToUse[i]][header];
        if (val !== undefined && val !== null && val !== "") {
          vals.add(String(val));
        }
      }
      
      const result = Array.from(vals).sort();
      filterCacheRef.current.set(cacheKey, result);
      uniqueVals[header] = result;
    });
    return uniqueVals;
  }, [warehouse, debouncedSearchTerm, debouncedColumnFilters, headers]);

  // 4. AMOUNT TRACKER IN INR (RUPEES) & WORDS
  const amountHeader = useMemo(() => {
    return headers.find(h => /amount/i.test(h));
  }, [headers]);

  const { totalAmount, filteredAmount } = useMemo(() => {
    if (!amountHeader) return { totalAmount: 0, filteredAmount: 0 };
    
    const parseAmount = (val) => {
      if (!val) return 0;
      const num = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
      return isNaN(num) ? 0 : num;
    };
    
    // Extreme micro-optimized reduction
    const total = warehouse.enhancedData.reduce((sum, row) => sum + parseAmount(row[amountHeader]), 0);
    const filtered = filteredData.reduce((sum, row) => sum + parseAmount(row[amountHeader]), 0);
    
    return { totalAmount: total, filteredAmount: filtered };
  }, [warehouse.enhancedData, filteredData, amountHeader]);

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
              State-of-the-art client-side data warehouse engine with partitioning and caching.
            </p>
          </div>

          <label className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-md z-10">
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
            Import any sheet to dynamically construct the data warehouse view.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Automatic Amount Tracking Dashboard */}
          {amountHeader && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <IndianRupee className="w-32 h-32" />
              </div>
              <div className="flex items-start md:items-center gap-4 z-10 w-full md:w-auto">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-inner mt-1 md:mt-0 flex-shrink-0">
                  <IndianRupee className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Filtered Amount</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(filteredAmount)}
                  </p>
                  <p className="text-[11px] text-slate-500 italic mt-0.5 font-medium leading-tight">
                    {convertNumberToWords(filteredAmount)}
                  </p>
                </div>
              </div>
              
              <div className="h-px w-full md:h-16 md:w-px bg-slate-800 z-10" />
              
              <div className="flex items-start md:items-center gap-4 z-10 w-full md:w-auto md:justify-end">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl shadow-inner mt-1 md:mt-0 md:order-last flex-shrink-0">
                  <Wallet className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left md:text-right w-full">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Overall Total</p>
                  <p className="text-xl font-bold text-slate-200 font-mono tracking-tight">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalAmount)}
                  </p>
                  <p className="text-[11px] text-slate-500 italic mt-0.5 font-medium leading-tight">
                    {convertNumberToWords(totalAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Interaction & Reset Filters Container */}
          <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Global text search across cells..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all w-full md:w-auto"
                  title="Clear all active filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
            
            <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Showing{" "}
              <span className="text-blue-400 font-bold">
                {filteredData.length}
              </span>{" "}
              of {data.length} rows
            </div>
          </div>

          {/* Core Table Viewport (Cascading Views) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-x-auto max-h-[600px] custom-scrollbar" ref={dropdownRef}>
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="p-3 font-semibold min-w-[160px] align-top"
                    >
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
                                  // Close dropdown if cell is clicked
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
        </div>
      )}
    </div>
  );
}
