// ===============================
// SAMYOG-AI Text Validator
// ===============================
// Replaces the 4-char chunk matching approach (too weak - let garbage through)
// with a two-stage check:
// 1. Basic quality check (length, not gibberish, not all same char)
// 2. Domain relevance check (must contain at least one keyword related to
//    NHAI / Railways / Airport / IncomeTax - otherwise reject before AI call)

const DOMAIN_KEYWORDS = [
  // NHAI / Roads
  "road", "highway", "pothole", "nhai", "expressway", "flyover",
  "bridge", "toll", "divider", "lane", "traffic", "construction",
  "underpass", "overpass", "bypass", "junction", "median",
  "pavement", "carriageway", "barricade", "signage", "street",

  // Railways
  "train", "railway", "station", "rail", "track", "platform",
  "ticket", "irctc", "coach", "berth", "locomotive", "signal",
  "crossing", "junction", "pantry", "reservation", "compartment",
  "delay", "passenger", "booking", "route",

  // Airport
  "airport", "flight", "airline", "runway", "baggage", "boarding",
  "terminal", "aircraft", "security", "immigration", "passport",
  "customs", "checkin", "departure", "arrival", "cargo", "aviation",
  "lounge", "tarmac", "hangar",

  // Income Tax
  "tax", "income", "refund", "itr", "pan", "deduction", "tds",
  "assessment", "portal", "challan", "return", "exemption",
  "demand", "notice", "penalty", "audit", "form16", "aadhaar",
  "taxpayer", "scrutiny"
];

// Returns true only if text seems like a valid, on-domain grievance
function isValidComplaint(text) {
  if (!text || typeof text !== "string") return false;

  const trimmed = text.trim();

  // ---- Stage 1: Basic quality checks ----

  // Too short
  if (trimmed.length < 10) return false;

  // All same repeated character (e.g. "aaaaaaaaa", "!!!!")
  if (/^(.)\1+$/.test(trimmed)) return false;

  // Only numbers or symbols, no real words
  const wordCount = trimmed.split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length;
  if (wordCount < 2) return false;

  // ---- Stage 2: Domain relevance check ----

  const lowerText = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  const isRelevant = DOMAIN_KEYWORDS.some(keyword =>
    lowerText.includes(keyword)
  );

  if (!isRelevant) {
    console.log("❌ Validator: no domain keywords found in:", trimmed);
    return false;
  }

  console.log("✅ Validator: complaint passed for:", trimmed);
  return true;
}

module.exports = isValidComplaint;