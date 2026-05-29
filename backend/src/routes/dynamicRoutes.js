import express from "express";
import { saveDynamic, loadDynamic, updateCell } from "../controllers/dynamicController.js";

const router = express.Router();

router.post("/save-dynamic", saveDynamic);
router.get("/load-dynamic", loadDynamic);
router.post("/update-cell", updateCell);

export default router;