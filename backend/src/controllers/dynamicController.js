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

const readDynamicWorkbook = () => {
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

export const saveDynamic = (req, res) => {
  try {
    const incomingData = normalizeWorkbookData(req.body.data || req.body);
    if (!incomingData) {
      return res.status(400).json({
        success: false,
        error: "Data must be an object representing sheets",
      });
    }

    dynamicSheetCache = incomingData;
    scheduleWorkbookWrite(incomingData);

    return res.json({
      success: true,
      message: "Dynamic backup accepted and queued for background save",
      sheets: Object.keys(incomingData),
    });
  } catch (error) {
    logger.error("[Dynamic Save Error]", { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const loadDynamic = (req, res) => {
  try {
    const workbookData = readDynamicWorkbook();
    const sheetNames = Object.keys(workbookData);
    const requestedSheet = req.query.sheet;

    if (!requestedSheet) {
      return res.json(workbookData);
    }

    const rows = workbookData[requestedSheet] || [];
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const requestedPageSize = Number.parseInt(req.query.pageSize || "1000", 10);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : 1000),
    );
    const start = (page - 1) * pageSize;
    const paginatedRows = rows.slice(start, start + pageSize);

    return res.json({
      sheets: sheetNames,
      activeSheet: requestedSheet,
      page,
      pageSize,
      totalRows: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
      data: {
        [requestedSheet]: paginatedRows,
      },
    });
  } catch (error) {
    logger.error("[Dynamic Load Error]", { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: error.message });
  }
};
