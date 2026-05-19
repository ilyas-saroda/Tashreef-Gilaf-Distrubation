import express from "express";
import dynamicRoutes from "./src/routes/dynamicRoutes.js";
import mainRoutes from "./src/routes/mainRoutes.js";

const app = express();
const PORT = 5000;

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

// Mount modular routers
app.use("/api", mainRoutes);
app.use("/api", dynamicRoutes);

app.listen(PORT, () => {
  console.log(
    `\n🚀 Local Excel Companion Server running on: http://localhost:${PORT}\n`,
  );
});