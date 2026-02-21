// ============================================================
//  services/aiService.js
//  Uses Google Gemini to recommend best hospital
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
  const locationStr      = address?.trim() || "Unknown";

  // Build a short summary of hospitals to send to Gemini
  const hospitalList = hospitals.map((h, i) =>
    `${i + 1}. ID: ${h.id} | City: ${h.City} | State: ${h.State} | ` +
    `Specialisation: ${h.Specialisation} | Beds: ${h["No of Beds"]} | ` +
    `Rating: ${h.Rating} | Schemes: ${h["Insurance Schemes"]}`
  ).join("\n");

  const prompt = `
You are a medical referral assistant for India.

Patient Details:
- Name: ${name}
- Age: ${age}
- Gender: ${gender}
- Condition: ${condition}
- Location: ${locationStr}
- BPL Status: ${bplStatus}
- Disabled: ${disabled}

Available Hospitals:
${hospitalList}

Task:
1. Pick the TOP 3 best hospitals for this patient based on specialisation match, rating, bed availability, and insurance scheme compatibility.
2. Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

Return this exact format:
{
  "recommended_hospitals": [
    {
      "id": "Hospital #X",
      "rank": 1
    },
    {
      "id": "Hospital #Y",
      "rank": 2
    },
    {
      "id": "Hospital #Z",
      "rank": 3
    }
  ],
  "ai_explanation": "One sentence explaining why the top hospital was chosen."
}
`;

  try {
    console.log(`🤖 Calling Gemini API for condition: ${condition}`);

    const response = await fetch(GEMINI_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Gemini status ${response.status}`);
    }

    const data     = await response.json();
    const rawText  = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    const cleaned  = rawText.replace(/```json|```/g, "").trim();
    const parsed   = JSON.parse(cleaned);

    const rankedIds    = parsed.recommended_hospitals || [];
    const ai_explanation = parsed.ai_explanation || "";

    // Match ranked IDs back to full hospital objects
    const aiHospitals = rankedIds
      .map(r => hospitals.find(h => h.id === r.id))
      .filter(Boolean);

    const best = aiHospitals[0];
    if (!best) throw new Error("Gemini returned no matching hospitals");

    console.log(`✅ Gemini recommended: ${best.id}`);

    return {
      hospital:            best.id,
      hospital_id:         best.id,
      distance_km:         parseFloat((best.distance_km || 0).toFixed(1)),
      specialty:           best.Specialisation,
      beds_available:      best["No of Beds"],
      priority,
      schemes_eligible,
      ai_reason:           ai_explanation,
      coordinates: {
        lat: best.Latitude  || 0,
        lng: best.Longitude || 0,
      },
      all_recommendations: aiHospitals,
    };

  } catch (err) {
    console.warn("⚠️  Gemini failed:", err.message, "— using fallback");

    // Fallback: sort by rating and bed count
    const fallback = [...hospitals]
      .filter(h => h.Specialisation?.toLowerCase().includes(condition.toLowerCase()))
      .sort((a, b) => b.Rating - a.Rating || b["No of Beds"] - a["No of Beds"])
      .slice(0, 3);

    const best = fallback[0] || hospitals[0];

    return {
      hospital:            best.id,
      hospital_id:         best.id,
      distance_km:         parseFloat((best.distance_km || 0).toFixed(1)),
      specialty:           best.Specialisation,
      beds_available:      best["No of Beds"],
      priority,
      schemes_eligible,
      ai_reason:           `Fallback: Best rated hospital for ${condition} near ${locationStr}.`,
      coordinates: {
        lat: best.Latitude  || 0,
        lng: best.Longitude || 0,
      },
      all_recommendations: fallback,
    };
  }
}

module.exports = { getAIRecommendation };