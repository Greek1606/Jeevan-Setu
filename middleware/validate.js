
function validateReferRequest(req, res, next) {
  const { name, age, gender, hospital, disease, bplStatus, disabled, location } = req.body;
  const errors = [];

  if (!name || name.trim() === "")
    errors.push("name is required");

  if (!age || typeof age !== "number" || age < 0 || age > 120)
    errors.push("age must be a number between 0 and 120");

  if (!gender || !["male", "female", "other"].includes(gender))
    errors.push("gender must be male, female, or other");

  if (!hospital || hospital.trim() === "")
    errors.push("hospital (current hospital) is required");

  if (!disease || disease.trim() === "")
    errors.push("disease (referral condition) is required");

  if (!bplStatus || !["below", "above"].includes(bplStatus))
    errors.push("bplStatus must be 'below' or 'above'");

  if (!disabled || !["yes", "no"].includes(disabled))
    errors.push("disabled must be 'yes' or 'no'");

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors,
    });
  }

  next();
}

module.exports = { validateReferRequest };