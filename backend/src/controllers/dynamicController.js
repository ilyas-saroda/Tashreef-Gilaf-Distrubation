import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DYNAMIC_EXCEL = "dynamic_live_backup.xlsx";
const dynamicPath = path.join(__dirname, "../../", DYNAMIC_EXCEL);

// Global Runtime RAM Cache for Dynamic Excel Viewer
let dynamicSheetCache = null;

export const saveDynamic = (req, res) => {
  try {
    let incomingData = req.body.data || req.body;
    if (typeof incomingData !== 'object' || Array.isArray(incomingData) || incomingData === null) {
      return res
        .status(400)
        .json({ success: false, error: "Data must be an object representing sheets" });
    }

    // 1. Immediately update RAM Cache
    dynamicSheetCache = incomingData;

    // 2. Return API response instantly to prevent UI blocking
    res.json({ success: true, message: 'Dynamic backup saved successfully' });

    // 3. Asynchronously write to physical file in the background
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();
        let totalRows = 0;
        for (const [sheetName, sheetData] of Object.entries(incomingData)) {
          const ws = XLSX.utils.json_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
          totalRows += sheetData.length;
        }
        XLSX.writeFile(wb, dynamicPath);
        console.log(
          `[Dynamic Backup] Background workbook written with ${totalRows} total rows across ${Object.keys(incomingData).length} sheets.`,
        );
      } catch (writeError) {
        console.error("[Background Save Error]:", writeError);
      }
    }, 0);
  } catch (error) {
    console.error("[Dynamic Save Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const loadDynamic = (req, res) => {
  try {
    // 1. Return from fast RAM cache if available
    if (dynamicSheetCache !== null) {
      return res.json(dynamicSheetCache);
    }

    // 2. Fallback to reading file system if RAM cache is empty
    if (!fs.existsSync(dynamicPath)) {
      return res.json({});
    }
    
    const wb = XLSX.readFile(dynamicPath);
    logger.info("📂 [File System]: Data loaded from physical Excel file.");
    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      return res.json({});
    }
    
    const allSheetsData = {};
    for (const sheetName of wb.SheetNames) {
      allSheetsData[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    }
    
    // 3. Populate cache and return
    dynamicSheetCache = allSheetsData;
    return res.json(dynamicSheetCache);
  } catch (error) {
    console.error("[Dynamic Load Error]:", error);
    return res.json({});
  }
};);
    return res.json({});
  }
};