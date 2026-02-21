// ============================================================
//  routes/hospitals.js
//  GET /hospitals — all hospitals
//  GET /cities    — unique city list for frontend dropdown
// ============================================================

const express           = require("express");
const router            = express.Router();
const { loadHospitals } = require("../utils/filestore");

// GET /hospitals
router.get("/", (req, res) => {
  const hospitals = loadHospitals();
  res.json({ success: true, count: hospitals.length, hospitals });
});

// GET /cities — returns sorted unique city names
router.get("/cities", (req, res) => {
  const hospitals = loadHospitals();
  const cities = [...new Set(
    hospitals
      .map(h => h.City && h.City.trim())
      .filter(Boolean)
  )].sort();
  res.json({ success: true, count: cities.length, cities });
});

module.exports = router;


