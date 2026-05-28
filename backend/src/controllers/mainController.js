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

const readMainData = () => {
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

export const saveAll = (req, res) => {
  try {
    const incomingData = req.body.data || req.body;
    if (!Array.isArray(incomingData)) {
      return res
        .status(400)
        .json({ success: false, error: "Data must be an array" });
    }

    mainDataCache = incomingData;
    scheduleMainWorkbookWrite(mainDataCache);

    return res.json({
      success: true,
      queued: true,
      rows: incomingData.length,
    });
  } catch (error) {
    logger.error("[Main Save Error]", { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateItem = (req, res) => {
  try {
    const { hofId, updates = {} } = req.body;
    if (!hofId) {
      return res
        .status(400)
        .json({ success: false, error: "hofId is required" });
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
    return res.json({ success: true, updated });
  } catch (error) {
    logger.error("[Main Item Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, error: error.message });
  }
};
