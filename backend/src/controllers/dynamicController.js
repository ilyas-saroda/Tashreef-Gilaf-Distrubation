import logger from "../config/logger.js";
import * as dynamicService from "../services/dynamicService.js";

export const saveDynamic = (req, res) => {
  try {
    const incomingData = req.body.data || req.body;
    const sheets = dynamicService.saveDynamicData(incomingData);

    return res.json({
      success: true,
      message: "Dynamic backup accepted and queued for background save",
      sheets,
    });
  } catch (error) {
    logger.error("[Dynamic Save Error]", { error: error.message, stack: error.stack });
    return res.status(error.message.includes("Data must be an object") ? 400 : 500).json({ success: false, error: error.message });
  }
};

export const loadDynamic = (req, res) => {
  try {
    const requestedSheet = req.query.sheet;
    const result = dynamicService.getPaginatedSheetData(requestedSheet, req.query.page, req.query.pageSize);

    if (result.isFullWorkbook) {
      return res.json(result.workbookData);
    }

    // Return paginated metadata
    delete result.isFullWorkbook;
    return res.json(result);
  } catch (error) {
    logger.error("[Dynamic Load Error]", { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCell = (req, res) => {
  try {
    const { rowId, columnKey, newValue, sheetName } = req.body;
    dynamicService.updateDynamicCell(rowId, columnKey, newValue, sheetName);
    
    return res.json({ success: true, message: "Cell updated successfully" });
  } catch (error) {
    logger.error("[Dynamic Cell Update Error]", { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: error.message });
  }
};
