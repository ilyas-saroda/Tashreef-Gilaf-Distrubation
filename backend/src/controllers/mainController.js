import logger from "../config/logger.js";
import * as mainService from "../services/mainService.js";

export const saveAll = (req, res) => {
  try {
    const incomingData = req.body.data || req.body;
    const rowsCount = mainService.saveAllData(incomingData);

    return res.json({
      success: true,
      queued: true,
      rows: rowsCount,
    });
  } catch (error) {
    logger.error("[Main Save Error]", { error: error.message, stack: error.stack });
    return res.status(error.message === "Data must be an array" ? 400 : 500).json({ success: false, error: error.message });
  }
};

export const updateItem = (req, res) => {
  try {
    const { hofId, updates = {} } = req.body;
    const updated = mainService.updateItemData(hofId, updates);

    return res.json({ success: true, updated });
  } catch (error) {
    logger.error("[Main Item Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(error.message === "hofId is required" ? 400 : 500).json({ success: false, error: error.message });
  }
};
