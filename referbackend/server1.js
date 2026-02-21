// ============================================================
//  JEEVAN SETU — server.js
// ============================================================

require("dotenv").config();
const express           = require("express");
const cors              = require("cors");

const { loadHospitals } = require("./utils/filestore");

const app = express();
app.use(cors({ origin: "*" }));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Routes
app.use("/api/referral", require("./routes/Refer"));
app.use("/hospitals",    require("./routes/hospital_route")); // includes /hospitals/cities

// Health check
app.get("/", (req, res) => {
  res.json({ message: "🏥 Jeevan Setu API running", total_hospitals: loadHospitals().length });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Jeevan Setu running at http://localhost:${PORT}`);
});