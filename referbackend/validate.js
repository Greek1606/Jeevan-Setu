function validateReferRequest(req, res, next) {
  const { patient, location, urgency, insurance } = req.body;
  const errors = [];

  // checking age --1
  if (!patient) {
    errors.push("patient object is required");
  } else {
    if (!patient.age || typeof patient.age !== "number")
      errors.push("patient.age must be a number");
    if (!patient.gender)
      errors.push("patient.gender is required");
    if (!Array.isArray(patient.symptoms) || patient.symptoms.length === 0)
      errors.push("patient.symptoms must be a non-empty array");
  }

  // Validate location--2
  if (!location) {
    errors.push("location object is required");
  } else {
    if (typeof location.lat !== "number") errors.push("location.lat must be a number");
    if (typeof location.lng !== "number") errors.push("location.lng must be a number");
  }

  // Validate urgency--3
  if (!urgency || !["LOW", "MEDIUM", "HIGH"].includes(urgency.toUpperCase()))
    errors.push("urgency must be LOW, MEDIUM, or HIGH");

  // Validate insurance--4
  if (!insurance || insurance.trim() === "")
    errors.push("insurance is required");

  // Return errors if any--5
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors,
    });
  }

  // Normalize urgency to uppercase
  req.body.urgency = urgency.toUpperCase();
  next();
}

module.exports = { validateReferRequest };