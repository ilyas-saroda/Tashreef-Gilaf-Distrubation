import { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

// Hook for debouncing fast typing
export function useDebounce(value, delay) {
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
export function convertNumberToWords(num) {
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

export function useDynamicEngine() {
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

  return {
    data,
    headers,
    searchTerm,
    setSearchTerm,
    columnFilters,
    setColumnFilters,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    loading,
    activeDropdown,
    setActiveDropdown,
    dropdownRef,
    handleFileUpload,
    handleCellEditStart,
    handleCellEditSave,
    handleResetFilters,
    hasActiveFilters,
    filteredData,
    uniqueColumnValues,
    amountHeader,
    totalAmount,
    filteredAmount
  };
}
