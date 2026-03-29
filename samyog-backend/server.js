require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const app = express();

// ✅ MIDDLEWARE FIRST
app.use(cors());
app.use(express.json());

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

const Grievance = require("./models/Grievance");

// ✅ ROUTES AFTER MIDDLEWARE
app.post("/api/grievance", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, text, department, location } = req.body;

    const newGrievance = new Grievance({
      name,
      phone,
      text,
      department,
      image: req.file ? req.file.filename : "",
      location: location ? JSON.parse(location) : null
    });

    await newGrievance.save();

    res.json({ message: "Grievance submitted successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("API running");
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});