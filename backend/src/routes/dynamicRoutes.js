import express from "express";
import { saveDynamic, loadDynamic } from "../controllers/dynamicController.js";

const router = express.Router();

router.post("/save-dynamic", saveDynamic);
router.get("/load-dynamic", loadDynamic);

export default router;