import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const FILTER_DEBOUNCE_MS = 180;
const MAX_FILTER_VALUES = 750;

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function convertNumberToWords(num) {
  if (!num || isNaN(num) || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
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

const parseAmount = (val) => {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const cleanWorkbookData = (workbookData) => {
  const payload = {};
  for (const [sheetName, rows] of Object.entries(workbookData)) {
    payload[sheetName] = rows.map((row) => {
      const { __originalIndex, __searchText, ...cleanRow } = row;
      return cleanRow;
    });
  }
  return payload;
};

export function useDynamicEngine() {
  const [allData, setAllData] = useState({});
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const saveTimerRef = useRef(null);

  const data = allData[activeSheet] || [];
  const headers = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);
  const debouncedSearchTerm = useDebounce(searchTerm, FILTER_DEBOUNCE_MS);
  const debouncedColumnFilters = useDebounce(columnFilters, FILTER_DEBOUNCE_MS);

  const fetchDynamicData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/load-dynamic`);
      const result = await res.json();

      const normalized =
        result && typeof result === "object" && result.sheets && result.data
          ? result.data
          : result;

      if (
        normalized &&
        typeof normalized === "object" &&
        !Array.isArray(normalized) &&
        Object.keys(normalized).length > 0
      ) {
        const sheetNames = Object.keys(normalized);
        setAllData(normalized);
        setSheets(sheetNames);
        setActiveSheet((current) => (current && normalized[current] ? current : sheetNames[0]));
      } else if (Array.isArray(normalized) && normalized.length > 0) {
        setAllData({ Sheet1: normalized });
        setSheets(["Sheet1"]);
        setActiveSheet("Sheet1");
      } else {
        setAllData({});
        setSheets([]);
        setActiveSheet("");
      }
    } catch (e) {
      console.error("Failed to load dynamic backup file:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDynamicData();
  }, [fetchDynamicData]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveUpdate = useCallback(async (updatedAllData) => {
    const payload = cleanWorkbookData(updatedAllData);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/save-dynamic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: payload }),
        });
      } catch (e) {
        console.warn("Could not save to dynamic server:", e);
      }
    }, 120);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const newAllData = {};

      wb.SheetNames.forEach((name) => {
        newAllData[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
          defval: "",
          raw: false,
        });
      });

      if (Object.keys(newAllData).length === 0) {
        alert("This Excel sheet seems to be empty.");
        return;
      }

      setAllData(newAllData);
      setSheets(wb.SheetNames);
      setActiveSheet(wb.SheetNames[0]);
      setColumnFilters({});
      setSearchTerm("");
      setActiveDropdown(null);
      await saveUpdate(newAllData);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleCellEditStart = (originalIndex, header, currentValue) => {
    setEditingCell({ originalIndex, header });
    setEditValue(String(currentValue ?? ""));
  };

  const handleCellEditSave = async (originalIndex, header) => {
    const activeSheetData = data.slice();
    activeSheetData[originalIndex] = {
      ...activeSheetData[originalIndex],
      [header]: editValue,
    };
    const updatedAllData = {
      ...allData,
      [activeSheet]: activeSheetData,
    };
    setAllData(updatedAllData);
    setEditingCell(null);
    await saveUpdate(updatedAllData);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setColumnFilters({});
    setActiveDropdown(null);
  };

  const hasActiveFilters =
    searchTerm !== "" || Object.values(columnFilters).some((value) => value !== "");

  const preparedRows = useMemo(() => {
    return data.map((row, originalIndex) => {
      const searchText = headers
        .map((header) => String(row[header] ?? "").toLowerCase())
        .join("\u0001");
      return { row, originalIndex, searchText };
    });
  }, [data, headers]);

  const activeFilterEntries = useMemo(() => {
    return Object.entries(debouncedColumnFilters)
      .filter(([, value]) => value)
      .map(([header, value]) => [header, String(value).toLowerCase()]);
  }, [debouncedColumnFilters]);

  const filteredEntries = useMemo(() => {
    const globalSearch = debouncedSearchTerm.trim().toLowerCase();
    const result = [];

    for (let i = 0; i < preparedRows.length; i++) {
      const entry = preparedRows[i];
      if (globalSearch && !entry.searchText.includes(globalSearch)) continue;

      let matches = true;
      for (let j = 0; j < activeFilterEntries.length; j++) {
        const [header, filterValue] = activeFilterEntries[j];
        if (!String(entry.row[header] ?? "").toLowerCase().includes(filterValue)) {
          matches = false;
          break;
        }
      }
      if (matches) result.push(entry);
    }

    return result;
  }, [preparedRows, debouncedSearchTerm, activeFilterEntries]);

  const filteredData = useMemo(() => {
    return filteredEntries.map(({ row, originalIndex }) => ({
      ...row,
      __originalIndex: originalIndex,
    }));
  }, [filteredEntries]);

  const uniqueColumnValues = useMemo(() => {
    const uniqueVals = {};
    headers.forEach((header) => {
      uniqueVals[header] = [];
    });

    const sets = {};
    headers.forEach((header) => {
      sets[header] = new Set();
    });

    for (let i = 0; i < filteredEntries.length; i++) {
      const row = filteredEntries[i].row;
      for (let h = 0; h < headers.length; h++) {
        const header = headers[h];
        const value = row[header];
        if (value === undefined || value === null || value === "") continue;
        if (sets[header].size < MAX_FILTER_VALUES) {
          sets[header].add(String(value));
        }
      }
    }

    headers.forEach((header) => {
      uniqueVals[header] = Array.from(sets[header]).sort();
    });
    return uniqueVals;
  }, [filteredEntries, headers]);

  const amountHeader = useMemo(() => headers.find((header) => /amount/i.test(header)), [headers]);

  const { totalAmount, filteredAmount } = useMemo(() => {
    if (!amountHeader) return { totalAmount: 0, filteredAmount: 0 };

    let total = 0;
    for (let i = 0; i < preparedRows.length; i++) {
      total += parseAmount(preparedRows[i].row[amountHeader]);
    }

    let filtered = 0;
    for (let i = 0; i < filteredEntries.length; i++) {
      filtered += parseAmount(filteredEntries[i].row[amountHeader]);
    }

    return { totalAmount: total, filteredAmount: filtered };
  }, [preparedRows, filteredEntries, amountHeader]);

  return {
    sheets,
    activeSheet,
    setActiveSheet,
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
    filteredAmount,
  };
}
