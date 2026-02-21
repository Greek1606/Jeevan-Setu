// ============================================================
//  services/aiService.js
//  Calls your Python/FastAPI external API at POST /recommend
//  Input:  { age, gender, condition, location }
//  Output: { recommended_hospitals, ai_explanation }
// ============================================================

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || "http://localhost:8000/recommend";

// Map disease to priority
function getPriority(disease) {
  const high   = ["cardiology", "neurology", "oncology", "pulmonology"];
  const medium = ["orthopedics", "gastroenterology", "nephrology", "endocrinology"];
  if (high.includes(disease))   return "HIGH";
  if (medium.includes(disease)) return "MEDIUM";
  return "NORMAL";
}

// Map BPL + disability to eligible schemes
function getEligibleSchemes(bplStatus, disabled, disease) {
  const schemes = ["AB-PMJAY"];
  if (bplStatus === "below")  schemes.push("NUHM", "ESI");
  if (disabled === "yes")     schemes.push("NDHM Disability Scheme");
  if (disease === "oncology") schemes.push("Rashtriya Arogya Nidhi");
  if (["cardiology", "neurology"].includes(disease)) schemes.push("CGHS");
  return schemes;
}

async function getAIRecommendation(body, hospitals) {
  const { name, age, gender, disease, otherDisease, bplStatus, disabled, address } = body;

  const priority         = getPriority(disease);
  const schemes_eligible = getEligibleSchemes(bplStatus, disabled, disease);
  const condition        = disease === "other" ? (otherDisease || "other") : disease;

  // ── Location string for Python API ───────────────────────
  // Your Python API filters hospitals by city name string
  // Use address if provided, otherwise fallback to condition
  const locationStr = address && address.trim() !== "" ? address.trim() : "Delhi";

  // ── Build payload matching your Python API's PatientInput ─
  const payload = {
    age:       age,
    gender:    gender,
    condition: condition,      // maps to PatientInput.condition
    location:  locationStr,    // maps to PatientInput.location (city name)
  };

  // ── Call your FastAPI /recommend endpoint ─────────────────
  try {
    console.log(`📡 Calling Python API: ${EXTERNAL_API_URL}`);
    console.log(`   Payload:`, payload);

    const response = await fetch(EXTERNAL_API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Status ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Python API responded:", result.status);

    // Python API returns: { recommended_hospitals: [...], ai_explanation: "..." }
    const hospitals = result.recommended_hospitals || [];
    const best      = hospitals[0];

    if (!best) throw new Error("No hospitals returned from Python API");

    // Map Python API response fields to what refer.js expects
    return {
      hospital:         best.id || best.City + " Hospital",
      hospital_id:      best.id,
      distance_km:      0,                          // Python API doesn't return distance
      specialty:        best.Specialisation || condition,
      beds_available:   best["No of Beds"] || 0,
      priority,
      schemes_eligible,
      ai_reason:        result.ai_explanation || "Recommended based on ratings and specialization.",
      coordinates: {
        lat: best.Latitude  || 0,
        lng: best.Longitude || 0,
      },
      all_recommendations: hospitals,               // all 3 hospitals returned by Python
    };

  } catch (err) {
    console.warn("⚠️  Python API failed:", err.message, "— using mock");
  }

  // ── Mock fallback if Python API is down ───────────────────
  console.warn("⚠️  Using mock recommendation");
  const best = hospitals[0];
  return {
    hospital:        best ? `${best.City} Hospital (${best.Specialisation})` : "City Hospital",
    hospital_id:     best?.id || "N/A",
    distance_km:     best ? parseFloat((best.distance_km || 0).toFixed(1)) : 0,
    specialty:       best?.Specialisation || condition,
    beds_available:  best?.["No of Beds"] || 0,
    priority,
    schemes_eligible,
    ai_reason:       `MOCK: Best hospital for ${condition} near ${locationStr} based on rating and bed availability.`,
    coordinates: {
      lat: best?.Latitude  || 0,
      lng: best?.Longitude || 0,
    },
  };
}

module.exports = { getAIRecommendation };