import express from "express";
import { saveAll, updateItem } from "../controllers/mainController.js";

const router = express.Router();

router.post("/save-all", saveAll);
router.post("/update-item", updateItem);

export default router;