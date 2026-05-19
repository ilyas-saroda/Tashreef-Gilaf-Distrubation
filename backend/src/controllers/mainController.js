import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAIN_EXCEL = "distribution_live_backup.xlsx";
const mainPath = path.join(__dirname, "../../", MAIN_EXCEL);

export const saveAll = (req, res) => {
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
};

export const updateItem = (req, res) => {
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
};