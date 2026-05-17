import express from 'express';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const FILE_NAME = 'distribution_live_backup.xlsx';
const FILE_PATH = path.join(__dirname, FILE_NAME);

// Increase payload limit for large excel data
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
  }
  next();
});

app.post('/api/save-all', (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Expected an array of data' });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Backup");
    XLSX.writeFile(wb, FILE_PATH);
    res.json({ success: true, message: 'Backup saved successfully' });
  } catch (error) {
    console.error('Save-all error:', error);
    res.status(500).json({ error: 'Failed to save backup', details: error.message });
  }
});

app.post('/api/update-item', (req, res) => {
  try {
    const { hofId, updates } = req.body;
    if (!hofId || !updates) {
      return res.status(400).json({ error: 'Missing hofId or updates' });
    }

    if (!fs.existsSync(FILE_PATH)) {
      return res.status(404).json({ error: 'Backup file does not exist yet' });
    }

    const wb = XLSX.readFile(FILE_PATH);
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const data = XLSX.utils.sheet_to_json(ws);

    let updated = false;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i].HOF_ID) === String(hofId) || String(data[i].hof_id) === String(hofId)) {
        if (updates.Status !== undefined) data[i].Status = updates.Status;
        if (updates.Received_By !== undefined) data[i].Received_By = updates.Received_By;
        if (updates.Update_Date !== undefined) data[i].Update_Date = updates.Update_Date;
        if (updates.Update_Day !== undefined) data[i].Update_Day = updates.Update_Day;
        if (updates.Update_Time !== undefined) data[i].Update_Time = updates.Update_Time;
        updated = true;
        break;
      }
    }

    if (!updated) {
      return res.status(404).json({ error: 'Item not found in backup' });
    }

    const newWs = XLSX.utils.json_to_sheet(data);
    wb.Sheets[wsName] = newWs;
    XLSX.writeFile(wb, FILE_PATH);

    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update-item error:', error);
    res.status(500).json({ error: 'Failed to update item', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Local backup server running on http://localhost:${PORT}`);
});