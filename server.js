import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const MAIN_EXCEL = "distribution_live_backup.xlsx";
const DYNAMIC_EXCEL = "dynamic_live_backup.xlsx";

const mainPath = path.join(__dirname, MAIN_EXCEL);
const dynamicPath = path.join(__dirname, DYNAMIC_EXCEL);

// CORS and Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: "50mb" }));

// 1. Main Tashrif Distribution: Save All
app.post("/api/save-all", (req, res) => {
  try {
    let incomingData = req.body.data || req.body;
    if (!Array.isArray(incomingData)) {
      return res
        .status(400)
        .json({ success: false, error: "Data must be an array" });
    }

    const ws = XLSX.utils.json_to_sheet(incomingData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");
    XLSX.writeFile(wb, mainPath);

    console.log(
      `[Main Backup] Total ${incomingData.length} records synchronized.`,
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("[Main Save Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Main Tashrif Distribution: Single Row Update
app.post("/api/update-item", (req, res) => {
  try {
    const { hofId, updates } = req.body;
    if (!hofId)
      return res
        .status(400)
        .json({ success: false, error: "hofId is required" });

    let currentData = [];
    if (fs.existsSync(mainPath)) {
      const wb = XLSX.readFile(mainPath);
      const sheetName = wb.SheetNames[0];
      currentData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    }

    currentData = currentData.map((item) => {
      if (String(item.HOF_ID || item.hof_id) === String(hofId)) {
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
      }
      return item;
    });

    const ws = XLSX.utils.json_to_sheet(currentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");
    XLSX.writeFile(wb, mainPath);

    return res.json({ success: true });
  } catch (error) {
    console.error("[Main Item Update Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Global Runtime RAM Cache for Dynamic Excel Viewer
let dynamicSheetCache = null;

// 3. Dynamic Sheets: Save Whole Sheet (100% Offline)
app.post("/api/save-dynamic", (req, res) => {
  try {
    let incomingData = req.body.data || req.body;
    if (!Array.isArray(incomingData)) {
      return res
        .status(400)
        .json({ success: false, error: "Data must be an array" });
    }

    // 1. Immediately update RAM Cache
    dynamicSheetCache = incomingData;

    // 2. Return API response instantly to prevent UI blocking
    res.json({ success: true, message: 'Dynamic backup saved successfully' });

    // 3. Asynchronously write to physical file in the background
    setTimeout(() => {
      try {
        const ws = XLSX.utils.json_to_sheet(incomingData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DynamicSheet");
        XLSX.writeFile(wb, dynamicPath);
        console.log(
          `[Dynamic Backup] Background sheet written with ${incomingData.length} rows.`,
        );
      } catch (writeError) {
        console.error("[Background Save Error]:", writeError);
      }
    }, 0);
  } catch (error) {
    console.error("[Dynamic Save Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Dynamic Sheets: GET Loader (Fixes the 404 & SyntaxError on Refresh!)
app.get("/api/load-dynamic", (req, res) => {
  try {
    // 1. Return from fast RAM cache if available
    if (dynamicSheetCache !== null) {
      return res.json(dynamicSheetCache);
    }

    // 2. Fallback to reading file system if RAM cache is empty
    if (!fs.existsSync(dynamicPath)) {
      return res.json([]);
    }
    
    const wb = XLSX.readFile(dynamicPath);
    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      return res.json([]);
    }
    
    const sheetName = wb.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    
    // 3. Populate cache and return
    dynamicSheetCache = rawData;
    return res.json(dynamicSheetCache);
  } catch (error) {
    console.error("[Dynamic Load Error]:", error);
    return res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(
    `\n🚀 Local Excel Companion Server running on: http://localhost:${PORT}\n`,
  );
});
