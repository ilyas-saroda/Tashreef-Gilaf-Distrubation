import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import logger from "./src/config/logger.js";
import dynamicRoutes from "./src/routes/dynamicRoutes.js";
import mainRoutes from "./src/routes/mainRoutes.js";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingVars.length > 0) {
  logger.error(`[Startup Error] Missing required environment variables: ${missingVars.join(", ")}`);
  console.error(`\n❌ [Startup Error] Missing required environment variables: ${missingVars.join(", ")}\nServer shutting down.`);
  process.exit(1); // Stop the server at startup
}

const app = express();
const PORT = process.env.PORT || 5000;

// Morgan HTTP request logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// CORS and Middleware
app.use((req, res, next) => {
  req.logger = logger;
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

// Diagnostic route
app.get("/api/test-logger", (req, res) => {
  console.log("🎯 [Terminal]: Test logger endpoint was hit!");
  req.logger?.info("🚀 Winston Info Log: Logger is working perfectly!");
  res.json({ success: true, message: "Logger diagnostic triggered! Check your backend/logs/ folder now." });
});

// Decoupled Entry Switchers for Independent Modules
app.use("/api/main", mainRoutes);
app.use("/api/dynamic", dynamicRoutes);

app.listen(PORT, () => {
  logger.info(`🚀 Local Excel Companion Server running on: http://localhost:${PORT}`);
  console.log(`\n🚀 Local Excel Companion Server running on: http://localhost:${PORT}\n`);
});
