import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import logger from "../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DYNAMIC_EXCEL = "dynamic_live_backup.xlsx";
const dynamicPath = path.join(__dirname, "../../", DYNAMIC_EXCEL);
const MAX_PAGE_SIZE = 5000;

let dynamicSheetCache = null;
let pendingWriteTimer = null;

const normalizeWorkbookData = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const normalized = {};
  for (const [sheetName, rows] of Object.entries(data)) {
    normalized[sheetName] = Array.isArray(rows) ? rows : [];
  }
  return normalized;
};

export const readDynamicWorkbook = () => {
  if (dynamicSheetCache !== null) return dynamicSheetCache;
  if (!fs.existsSync(dynamicPath)) {
    dynamicSheetCache = {};
    return dynamicSheetCache;
  }

  const wb = XLSX.readFile(dynamicPath, { cellDates: false });
  const allSheetsData = {};
  for (const sheetName of wb.SheetNames || []) {
    allSheetsData[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      defval: "",
      raw: false,
    });
  }

  dynamicSheetCache = allSheetsData;
  logger.info("[Dynamic File System]: Data loaded from physical Excel file.");
  return dynamicSheetCache;
};

const scheduleWorkbookWrite = (workbookData) => {
  if (pendingWriteTimer) clearTimeout(pendingWriteTimer);

  pendingWriteTimer = setTimeout(() => {
    try {
      const wb = XLSX.utils.book_new();
      let totalRows = 0;

      for (const [sheetName, sheetData] of Object.entries(workbookData)) {
        const rows = Array.isArray(sheetData) ? sheetData : [];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
        totalRows += rows.length;
      }

      XLSX.writeFile(wb, dynamicPath, { compression: true });
      logger.info(
        `[Dynamic Backup] Workbook written with ${totalRows} rows across ${Object.keys(workbookData).length} sheets.`,
      );
    } catch (writeError) {
      logger.error("[Dynamic Background Save Error]", {
        error: writeError.message,
        stack: writeError.stack,
      });
    }
  }, 150);
};

export const saveDynamicData = (incomingData) => {
  const normalizedData = normalizeWorkbookData(incomingData);
  if (!normalizedData) {
    throw new Error("Data must be an object representing sheets");
  }

  dynamicSheetCache = normalizedData;
  scheduleWorkbookWrite(normalizedData);
  return Object.keys(normalizedData);
};

export const getPaginatedSheetData = (requestedSheet, pageStr, pageSizeStr) => {
  const workbookData = readDynamicWorkbook();
  const sheetNames = Object.keys(workbookData);

  if (!requestedSheet) {
    return { isFullWorkbook: true, workbookData };
  }

  const rows = workbookData[requestedSheet] || [];
  const page = Math.max(1, Number.parseInt(pageStr || "1", 10));
  const requestedPageSize = Number.parseInt(pageSizeStr || "1000", 10);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : 1000),
  );
  const start = (page - 1) * pageSize;
  const paginatedRows = rows.slice(start, start + pageSize);

  return {
    isFullWorkbook: false,
    sheets: sheetNames,
    activeSheet: requestedSheet,
    page,
    pageSize,
    totalRows: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    data: {
      [requestedSheet]: paginatedRows,
    },
  };
};

export const updateDynamicCell = (rowId, columnKey, newValue, sheetName) => {
  if (!dynamicSheetCache) {
    readDynamicWorkbook();
  }

  if (!dynamicSheetCache[sheetName]) {
    dynamicSheetCache[sheetName] = [];
  }

  if (dynamicSheetCache[sheetName][rowId]) {
    dynamicSheetCache[sheetName][rowId][columnKey] = newValue;
  } else {
    dynamicSheetCache[sheetName][rowId] = { [columnKey]: newValue };
  }

  scheduleWorkbookWrite(dynamicSheetCache);
};
