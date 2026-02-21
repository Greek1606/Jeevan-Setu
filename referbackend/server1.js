require("dotenv").config();
const express           = require("express");
const cors              = require("cors");
const { loadHospitals } = require("./utils/fileStore");

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serves index.html

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/referral", require("./routes/refer"));     // ← matches frontend POST
app.use("/hospitals",    require("./routes/hospitals"));

// GET / — health check
app.get("/", (req, res) => {
  res.json({ message: "🏥 Jeevan Setu API running", total_hospitals: loadHospitals().length });
});

// GET /health — frontend pings this to check API status
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000; // frontend uses port 8000
app.listen(PORT, () => {
  console.log(`🚀 Jeevan Setu running at http://localhost:${PORT}`);
  console.log(`📁 Using hospitals.json — no database needed!`);
});