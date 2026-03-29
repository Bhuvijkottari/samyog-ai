const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema({
  name: String,
  phone: String,
  text: String,
  department: String,
  image: String,
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    default: "submitted"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Grievance", grievanceSchema);