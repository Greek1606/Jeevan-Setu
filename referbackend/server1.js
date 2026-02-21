require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { loadHospitals } = require("./utils/fileStore");

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static("public"));


app.use("/api/refer",  require("./routes/refer"));
app.use("/hospitals",  require("./routes/hospitals"));

// GET / — Health check
app.get("/", (req, res) => {
  res.json({
    message:          "🏥 Jeevan Setu Hospital API running",
    total_hospitals:  loadHospitals().length,
    endpoints: {
      refer:      "POST /api/refer",
      hospitals:  "GET /hospitals",
    },
  });
});

// ─── Starting server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Jeevan Setu running at http://localhost:3000`);
  console.log(`📁 Using hospitals.json`);
});
