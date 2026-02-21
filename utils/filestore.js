// ============================================================
//  utils/fileStore.js
//  Reads hospitals.json and writes to referrals.json
// ============================================================

const fs   = require("fs");
const path = require("path");

const HOSPITALS_FILE = path.join(__dirname, "../hospitals.json");
const REFERRALS_FILE = path.join(__dirname, "../referrals.json");

function loadHospitals() {
  return JSON.parse(fs.readFileSync(HOSPITALS_FILE, "utf-8"));
}

function saveReferral(referral) {
  let referrals = [];
  if (fs.existsSync(REFERRALS_FILE)) {
    referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, "utf-8"));
  }
  referrals.push({ ...referral, createdAt: new Date().toISOString() });
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
}

module.exports = { loadHospitals, saveReferral };