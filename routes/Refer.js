// ============================================================
//  routes/refer.js
//  POST /api/referral — matches frontend form fields exactly
// ============================================================

const express                  = require("express");
const router                   = express.Router();
const { validateReferRequest } = require("../middleware/validate");
const { getAIRecommendation }  = require("../services/aiService");
const { loadHospitals, saveReferral } = require("../utils/fileStore");
const { getDistanceKm }        = require("../utils/distance");

// Generate a simple referral ID
function genReferralId() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `REF-${ts}-${rand}`;
}

// POST /api/referral
router.post("/", validateReferRequest, async (req, res) => {
  const {
    name, age, gender,
    hospital,           // current hospital (where patient is now)
    disease, otherDisease,
    bplStatus, disabled,
    location,           // { lat, lng } from GPS — may be null
    address,
    timestamp,
  } = req.body;

  try {
    // Step 1: Load all 2555 hospitals
    const allHospitals = loadHospitals();

    // Step 2: Filter by distance (50km) and beds > 0
    // If no GPS, skip distance filter and just return top hospitals by beds
    let nearby;
    if (location && location.lat && location.lng) {
      nearby = allHospitals
        .map((h) => ({
          ...h,
          distance_km: getDistanceKm(location.lat, location.lng, h.Latitude, h.Longitude),
        }))
        .filter((h) => h.distance_km <= 50 && h["No of Beds"] > 0)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 10);
    } else {
      // No GPS — filter by disease specialty and take top 10 by beds
      nearby = allHospitals
        .filter((h) => h["No of Beds"] > 0)
        .sort((a, b) => b["No of Beds"] - a["No of Beds"])
        .slice(0, 10)
        .map((h) => ({ ...h, distance_km: 0 }));
    }

    if (nearby.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No hospitals found with available beds.",
      });
    }

    // Step 3: Get AI recommendation
    const recommendation = await getAIRecommendation(req.body, nearby);

    // Step 4: Generate referral ID and save record
    const referral_id = genReferralId();

    saveReferral({
      referral_id,
      patientName:  name,
      age, gender,
      currentHospital: hospital,
      disease:      disease === "other" ? otherDisease : disease,
      bplStatus,
      disabled,
      location,
      address,
      recommendedHospital: recommendation.hospital,
      priority:     recommendation.priority,
      schemes:      recommendation.schemes_eligible,
      aiReason:     recommendation.ai_reason,
      timestamp:    timestamp || new Date().toISOString(),
    });

    // Step 5: Send response — matches what frontend expects to display
    return res.status(200).json({
      success:         true,
      referral_id,
      patient_name:    name,
      disease_label:   disease === "other" ? (otherDisease || "Other") : disease,
      priority:        recommendation.priority,
      schemes_eligible: recommendation.schemes_eligible,
      received_at:     new Date().toISOString(),
      hospital:        recommendation.hospital,
      hospital_id:     recommendation.hospital_id,
      distance_km:     recommendation.distance_km,
      specialty:       recommendation.specialty,
      beds_available:  recommendation.beds_available,
      ai_reason:       recommendation.ai_reason,
      coordinates:     recommendation.coordinates,
    });

  } catch (err) {
    console.error("❌ /api/referral error:", err.message);
    return res.status(500).json({ success: false, error: "Something went wrong." });
  }
});

module.exports = router;