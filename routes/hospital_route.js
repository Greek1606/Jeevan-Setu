const express           = require("express");
const router            = express.Router();
const { loadHospitals } = require("../utils/fileStore");

router.get("/", (req, res) => {
  const hospitals = loadHospitals();
  res.json({ success: true, count: hospitals.length, hospitals });
});

module.exports = router;


