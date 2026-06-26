const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema({
  name: String,
  phone: String,
  text: String,

  department: String,
  predictedDepartment: String,

  subIssue: String,
  severity: String,
  description: String,

  image: String,

  location: {
    lat: Number,
    lng: Number
  },

  // 🔥 NEW - human-readable address from reverse geocoding
  address: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["Pending", "Resolved", "Escalated", "Closed"],
    default: "Pending"
  },

  priority: {
    type: String,
    default: "LOW"
  },

  priorityLevel: {
    type: Number,
    default: 1
  },

  // 🔥 NEW - AI confidence scores, useful for admin triage / debugging
  textConfidence: {
    type: Number,
    default: 0
  },

  imageConfidence: {
    type: Number,
    default: 0
  },

  predictionMismatch: {
    type: Boolean,
    default: false
  },

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  feedbackText: {
    type: String,
    default: ""
  },

  isEscalated: {
    type: Boolean,
    default: false
  },

  isFraud: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Grievance", grievanceSchema);