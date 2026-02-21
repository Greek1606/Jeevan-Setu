// ============================================================
//  services/aiService.js
//  Sends patient data + nearby hospitals to external API
//  Returns best hospital recommendation
// ============================================================

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || "http://localhost:5000/recommend";

// Map disease to priority based on urgency
function getPriority(disease) {
  const high   = ["cardiology", "neurology", "oncology", "pulmonology"];
  const medium = ["orthopedics", "gastroenterology", "nephrology", "endocrinology", "psychiatry"];
  if (high.includes(disease))   return "HIGH";
  if (medium.includes(disease)) return "MEDIUM";
  return "NORMAL";
}

// Map BPL + disability to eligible government schemes
function getEligibleSchemes(bplStatus, disabled, disease) {
  const schemes = ["AB-PMJAY"]; // everyone gets Ayushman Bharat base
  if (bplStatus === "below")  schemes.push("NUHM", "ESI");
  if (disabled === "yes")     schemes.push("NDHM Disability Scheme");
  if (disease === "oncology") schemes.push("Rashtriya Arogya Nidhi");
  if (disease === "cardiology" || disease === "neurology") schemes.push("CGHS");
  return schemes;
}

async function getAIRecommendation(body, hospitals) {
  const { name, age, gender, disease, otherDisease, bplStatus, disabled, location } = body;

  const priority         = getPriority(disease);
  const schemes_eligible = getEligibleSchemes(bplStatus, disabled, disease);
  const condition        = disease === "other" ? (otherDisease || "other") : disease;

  // Build payload for external API
  const payload = {
    patient: { name, age, gender, disease: condition, bplStatus, disabled },
    priority,
    schemes_eligible,
    location,
    hospitals: hospitals.map((h) => ({
      id:                h.id,
      name:              `${h.City} Hospital (${h.Specialisation})`,
      city:              h.City,
      state:             h.State,
      district:          h.District,
      speciality:        h.Specialisation,
      beds_available:    h["No of Beds"],
      insurance_schemes: h["Insurance Schemes"],
      rating:            h.Rating,
      distance_km:       parseFloat(h.distance_km.toFixed(1)),
      coordinates:       { lat: h.Latitude, lng: h.Longitude },
    })),
  };

  // ── Call external API ─────────────────────────────────────
  if (process.env.EXTERNAL_API_URL) {
    try {
      console.log(`📡 Calling external API: ${EXTERNAL_API_URL}`);
      const response = await fetch(EXTERNAL_API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const result = await response.json();
      console.log("✅ External API responded");
      return { ...result, priority, schemes_eligible };
    } catch (err) {
      console.warn("⚠️  External API failed:", err.message, "— using mock");
    }
  }

  // ── Gemini fallback ───────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `
You are a hospital referral assistant for rural India (Jeevan Setu).

PATIENT: ${name}, Age ${age}, ${gender}
Condition: ${condition}
BPL Status: ${bplStatus}, Disabled: ${disabled}
Priority: ${priority}

NEARBY HOSPITALS:
${JSON.stringify(payload.hospitals, null, 2)}

Pick the BEST hospital matching the condition and priority.
Respond ONLY with JSON:
{
  "hospital": "<name>",
  "hospital_id": "<id>",
  "distance_km": <number>,
  "specialty": "<specialty>",
  "beds_available": <number>,
  "ai_reason": "<1-2 sentences>",
  "coordinates": { "lat": <number>, "lng": <number> }
}`.trim();

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" },
          }),
        }
      );
      const d    = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { ...JSON.parse(text), priority, schemes_eligible };
    } catch (err) {
      console.warn("⚠️  Gemini failed:", err.message, "— using mock");
    }
  }

  // ── Mock fallback ─────────────────────────────────────────
  console.warn("⚠️  Using mock recommendation");
  const best = payload.hospitals[0];
  return {
    hospital:        best.name,
    hospital_id:     best.id,
    distance_km:     best.distance_km,
    specialty:       best.speciality,
    beds_available:  best.beds_available,
    priority,
    schemes_eligible,
    ai_reason:       `MOCK: ${best.name} in ${best.city}, ${best.state} is the nearest hospital with ${best.beds_available} beds matching ${condition} specialty.`,
    coordinates:     best.coordinates,
  };
}

module.exports = { getAIRecommendation };