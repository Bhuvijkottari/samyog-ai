require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const getPriority = require("./priorityAI");
const isValidComplaint = require("./textValidator");

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// CONFIG
// ===============================
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

// Confidence below this -> don't trust the AI, ask user to pick manually
const CONFIDENCE_THRESHOLD = 0.75;

// Minimum gap between top-2 scores - if model is split between classes, distrust it
const MIN_CONFIDENCE_GAP = 0.2;

// ===============================
// MULTER SETUP
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// ===============================
// MODEL
// ===============================
const Grievance = require("./models/Grievance");

// ===============================
// MOCK SMS
// ===============================
function sendSMS(phone, message) {
  console.log(`📩 SMS to ${phone}: ${message}`);
}

// ===============================
// REVERSE GEOCODING (lat/lng -> readable address)
// Uses OpenStreetMap Nominatim - free, no API key needed.
// Also reuses Overpass to detect nearby railway/airport infra.
// ===============================
async function reverseGeocode(lat, lng) {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        lat,
        lon: lng,
        format: "json"
      },
      headers: {
        // Nominatim requires a descriptive User-Agent or it may reject requests
        "User-Agent": "SAMYOG-AI-Grievance-System/1.0"
      }
    });

    return res.data?.display_name || "";
  } catch (err) {
    console.log("❌ Reverse geocode error:", err.message);
    return "";
  }
}

async function detectLocationType(lat, lng) {
  try {
    const query = `
      [out:json];
      (
        node["railway"="station"](around:2000, ${lat}, ${lng});
        node["aeroway"="aerodrome"](around:5000, ${lat}, ${lng});
      );
      out;
    `;

    const response = await axios.post(
      "https://overpass.kumi.systems/api/interpreter",
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const elements = response.data.elements || [];

    let isRailway = false;
    let isAirport = false;

    elements.forEach((el) => {
      if (el.tags?.railway === "station") isRailway = true;
      if (el.tags?.aeroway === "aerodrome") isAirport = true;
    });

    if (isAirport) return "Airport";
    if (isRailway) return "Railways";

    return "Unknown";

  } catch (err) {
    console.log("❌ Location API error:", err.message);
    return "Unknown";
  }
}

// ===============================
// AI SERVICE CALLS (persistent FastAPI service - replaces exec() spawning)
// ===============================
async function predictText(text) {
  try {
    const form = new URLSearchParams();
    form.append("text", text);

    const res = await axios.post(`${AI_SERVICE_URL}/predict-text`, form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    return res.data; // { label, confidence, all_scores }
  } catch (err) {
    console.log("⚠️ Text AI service unreachable, using fallback:", err.message);
    return null;
  }
}

async function predictImage(filePath) {
  try {
    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));

    const res = await axios.post(`${AI_SERVICE_URL}/predict-image`, form, {
      headers: form.getHeaders()
    });

    return res.data; // { label, confidence, all_scores }
  } catch (err) {
    console.log("⚠️ Image AI service unreachable:", err.message);
    return null;
  }
}

// ===============================
// FALLBACK (keyword matching, used if AI service is down or low confidence)
// ===============================
function fallbackDepartment(text) {
  text = text.toLowerCase();

  if (text.includes("pothole") || text.includes("road") || text.includes("highway"))
    return "NHAI";

  if (text.includes("train") || text.includes("rail") || text.includes("station"))
    return "Railways";

  if (text.includes("airport") || text.includes("flight"))
    return "Airport";

  if (text.includes("tax") || text.includes("refund"))
    return "IncomeTax";

  return "Unknown";
}

// ===============================
// STEP 1: ANALYZE
// ===============================
app.post("/api/grievance", upload.single("image"), async (req, res) => {
  try {
    let { text, department, location } = req.body;
    const imageFile = req.file;

    // 🔥 VALIDATION: at least one of text or image is required, not both mandatory
    const hasText = text && text.trim().length > 0;
    const hasImage = !!imageFile;

    if (!hasText && !hasImage) {
      return res.status(400).json({
        error: "Please provide either a complaint description or an image."
      });
    }

    if (hasText && !isValidComplaint(text)) {
      return res.status(400).json({
        error: "Add more detailed complaint."
      });
    }

    // ---- LOCATION ----
    let locDept = "Unknown";
    let address = "";

    if (location) {
      const parsed = JSON.parse(location);
      locDept = await detectLocationType(parsed.lat, parsed.lng);
      address = await reverseGeocode(parsed.lat, parsed.lng);
    }

    // ---- TEXT PREDICTION ----
    let textResult = null;
    if (hasText) {
      textResult = await predictText(text);
    }

    let textDept = textResult?.label || "Unknown";
    let textConfidence = textResult?.confidence || 0;

    // Entropy gap check: if top 2 scores are too close, model is genuinely unsure
    if (textResult?.all_scores) {
      const scores = Object.values(textResult.all_scores).sort((a, b) => b - a);
      const gap = scores[0] - scores[1];
      if (gap < MIN_CONFIDENCE_GAP) {
        console.log(`⚠️ Low confidence gap (${gap.toFixed(2)}) - treating as Unknown`);
        textDept = "Unknown";
        textConfidence = 0;
      }
    }

    if (!textResult || textConfidence < CONFIDENCE_THRESHOLD) {
      // low confidence or service down -> fall back to keyword matching
      const fb = hasText ? fallbackDepartment(text) : "Unknown";
      if (fb !== "Unknown") {
        textDept = fb;
        textConfidence = textConfidence || 0.5; // keyword match, moderate trust
      }
    }

    // ---- IMAGE PREDICTION ----
    let imageResult = null;
    if (hasImage) {
      imageResult = await predictImage(imageFile.path);
    }

    let imageDept = imageResult?.label || "Unknown";
    let imageConfidence = imageResult?.confidence || 0;

    // ---- MISMATCH DETECTION ----
    // Only flag a mismatch if BOTH text and image gave a confident, different answer
    let predictionMismatch = false;
    if (
      hasText && hasImage &&
      textDept !== "Unknown" && imageDept !== "Unknown" &&
      textDept !== imageDept &&
      textConfidence >= CONFIDENCE_THRESHOLD &&
      imageConfidence >= CONFIDENCE_THRESHOLD
    ) {
      predictionMismatch = true;
    }

    // ---- FINAL DEPARTMENT DECISION ----
    let finalDept = department || textDept;

    // Location-based GPS detection overrides if it found an actual NHAI/Airport/Railways match
    if (["Airport", "Railways", "NHAI"].includes(locDept)) {
      finalDept = locDept;
    } else if (hasImage && imageConfidence > textConfidence && imageDept !== "Unknown") {
      // if the image is more confident than text, trust it more
      finalDept = imageDept;
    }

    if (finalDept === "Unknown" && !predictionMismatch) {
      return res.status(400).json({
        error: "Could not detect a department. Please select one manually.",
        requiresManualSelection: true
      });
    }

    const priorityData = (hasText && getPriority(text)) || {
      label: "LOW",
      level: 1
    };

    res.json({
      success: true,
      predictedDepartment: finalDept,
      priority: priorityData.label,
      priorityLevel: priorityData.level,

      // 🔥 NEW - confidence + mismatch info for the frontend to show warnings
      textConfidence,
      imageConfidence,
      predictionMismatch,
      mismatchMessage: predictionMismatch
        ? `Your complaint text suggests "${textDept}" but the image looks like "${imageDept}". Please confirm the correct department.`
        : null,

      address
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ===============================
// STEP 2: FINAL SAVE
// ===============================
app.post("/api/grievance/final", upload.single("image"), async (req, res) => {
  try {
    let {
      name,
      phone,
      text,
      department,
      subIssue,
      severity,
      description,
      location,
      address,
      priority,
      priorityLevel,
      textConfidence,
      imageConfidence,
      predictionMismatch
    } = req.body;

    const newGrievance = new Grievance({
      name,
      phone,
      text,

      department,
      predictedDepartment: department,

      subIssue,
      severity,
      description,

      image: req.file ? req.file.filename : "",
      location: location ? JSON.parse(location) : null,
      address: address || "",

      status: "Pending",

      priority: priority || "LOW",
      priorityLevel: priorityLevel || 1,

      textConfidence: textConfidence || 0,
      imageConfidence: imageConfidence || 0,
      predictionMismatch: predictionMismatch === "true" || predictionMismatch === true,

      rating: 0,
      feedbackText: "",

      isEscalated: false,
      isFraud: false
    });

    await newGrievance.save();

    // FRAUD DETECTION
    const count = await Grievance.countDocuments({ phone });

    if (count >= 3) {
      await Grievance.updateMany({ phone }, { isFraud: true });
      console.log("🚨 Fraud detected:", phone);
    }

    sendSMS(phone, `Grievance ID: ${newGrievance._id}`);

    res.json({
      success: true,
      message: "Grievance submitted successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Final submission failed" });
  }
});

// ===============================
// GET DATA
// ===============================
app.get("/api/grievances", async (req, res) => {
  try {
    const { department, phone } = req.query;

    let query = {};
    if (department) query.department = department;
    if (phone) query.phone = phone.trim();

    const data = await Grievance.find(query).sort({ createdAt: -1 });

    res.json(data);

  } catch {
    res.status(500).json({ error: "Fetch error" });
  }
});

// ===============================
// UPDATE STATUS
// ===============================
app.put("/api/grievance/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const updated = await Grievance.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    sendSMS(updated.phone, `Status: ${status}`);

    res.json(updated);

  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

// ===============================
// ROOT
// ===============================
app.get("/", (req, res) => {
  res.send("API running 🚀");
});

// ===============================
// DB
// ===============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ===============================
// SERVER
// ===============================
app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
  console.log(`AI service expected at ${AI_SERVICE_URL}`);
});