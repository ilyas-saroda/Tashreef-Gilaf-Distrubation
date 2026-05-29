import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import logger from "../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAIN_EXCEL = "distribution_live_backup.xlsx";
const mainPath = path.join(__dirname, "../../", MAIN_EXCEL);

let mainDataCache = null;
let pendingMainWriteTimer = null;

export const readMainData = () => {
  if (mainDataCache !== null) return mainDataCache;
  if (!fs.existsSync(mainPath)) {
    mainDataCache = [];
    return mainDataCache;
  }

  const wb = XLSX.readFile(mainPath, { cellDates: false });
  const sheetName = wb.SheetNames[0];
  mainDataCache = sheetName
    ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
        defval: "",
        raw: false,
      })
    : [];
  return mainDataCache;
};

const scheduleMainWorkbookWrite = (rows) => {
  if (pendingMainWriteTimer) clearTimeout(pendingMainWriteTimer);

  pendingMainWriteTimer = setTimeout(() => {
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");
      XLSX.writeFile(wb, mainPath, { compression: true });
      logger.info(`[Main Backup] ${rows.length} records written to disk.`);
    } catch (error) {
      logger.error("[Main Background Save Error]", {
        error: error.message,
        stack: error.stack,
      });
    }
  }, 150);
};

export const saveAllData = (incomingData) => {
  if (!Array.isArray(incomingData)) {
    throw new Error("Data must be an array");
  }

  mainDataCache = incomingData;
  scheduleMainWorkbookWrite(mainDataCache);
  return incomingData.length;
};

export const updateItemData = (hofId, updates = {}) => {
  if (!hofId) {
    throw new Error("hofId is required");
  }

  const currentData = readMainData();
  let updated = false;

  mainDataCache = currentData.map((item) => {
    if (String(item.HOF_ID || item.hof_id) !== String(hofId)) return item;

    updated = true;
    let statusString = updates.Status;
    if (updates.Status === "Given" && updates.Received_By) {
      statusString = `Given to ${updates.Received_By}`;
    }

    return {
      ...item,
      Status: statusString ?? item.Status,
      Given_To: updates.Received_By ?? item.Given_To ?? item.Received_By,
      Update_Date: updates.Update_Date ?? item.Update_Date,
      Update_Day: updates.Update_Day ?? item.Update_Day,
      Update_Time: updates.Update_Time ?? item.Update_Time,
    };
  });

  if (updated) scheduleMainWorkbookWrite(mainDataCache);
  return updated;
};
