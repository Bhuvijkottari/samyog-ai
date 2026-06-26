import React, { useState, useEffect } from "react";
import axios from "axios";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function GrievanceForm() {
  const navigate = useNavigate();

  const [prediction, setPrediction] = useState("");
  const [priority, setPriority] = useState("");

  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  const [loading, setLoading] = useState(false);

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");

  // 🔥 NEW - mismatch warning state
  const [mismatchWarning, setMismatchWarning] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    text: "",
    department: ""
  });

  useEffect(() => {
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) {
      setForm((prev) => ({ ...prev, phone: savedPhone }));
    }
  }, []);

  // 📍 LOCATION
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => alert("Location access denied")
    );
  };

  // 🔐 OTP
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
  };

  const sendOtp = async () => {
    if (!form.phone) return alert("Enter phone number");

    try {
      setupRecaptcha();

      const result = await signInWithPhoneNumber(
        auth,
        "+91" + form.phone,
        window.recaptchaVerifier
      );

      setConfirmationResult(result);
      alert("✅ OTP Sent");
    } catch (err) {
      console.log(err);
      alert("❌ OTP Failed");
    }
  };

  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");

    try {
      await confirmationResult.confirm(otp);
      setIsVerified(true);
      alert("✅ Verified");
    } catch {
      alert("❌ Invalid OTP");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  // 🚀 SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isVerified) return alert("Verify phone first");

    // 🔥 VALIDATION: require text OR image, not necessarily both
    const hasText = form.text && form.text.trim().length > 0;
    const hasImage = !!image;

    if (!hasText && !hasImage) {
      return alert("Please provide either a complaint description or an image.");
    }

    setMismatchWarning(null);
    setLoading(true);

    const formData = new FormData();
    Object.keys(form).forEach((key) => {
      formData.append(key, form[key]);
    });

    if (image) formData.append("image", image);
    if (location) formData.append("location", JSON.stringify(location));

    try {
      const res = await axios.post(
        "http://localhost:5000/api/grievance",
        formData
      );

      const dept = res.data.predictedDepartment;

      setPrediction(dept);
      setPriority(res.data.priority);
      setAddress(res.data.address || "");

      // 🔥 Show mismatch warning if text and image disagree
      if (res.data.predictionMismatch) {
        setMismatchWarning(res.data.mismatchMessage);
        setLoading(false);
        return; // don't navigate yet - let user see + acknowledge the warning
      }

      localStorage.setItem("userPhone", form.phone);

      // ✅ STORE ALL DATA FOR NEXT PAGE
      localStorage.setItem("grievanceForm", JSON.stringify(form));
      localStorage.setItem("predictedDept", dept);
      localStorage.setItem("priority", res.data.priority);
      localStorage.setItem("priorityLevel", res.data.priorityLevel);
      localStorage.setItem("textConfidence", res.data.textConfidence);
      localStorage.setItem("imageConfidence", res.data.imageConfidence);

      if (res.data.address) {
        localStorage.setItem("address", res.data.address);
      }
      if (location) {
        localStorage.setItem("location", JSON.stringify(location));
      }

      alert("✅ Analysis Successful");
      navigate("/details");

    } catch (err) {
      console.log(err);
      if (err.response?.data?.requiresManualSelection) {
        alert("Couldn't auto-detect the department. Please select one manually below and submit again.");
      } else {
        alert(err.response?.data?.error || "❌ Submission Failed");
      }
    }

    setLoading(false);
  };

  // User confirms despite the mismatch warning -> proceed with whichever
  // department they pick manually from the dropdown
  const proceedDespiteMismatch = () => {
    if (!form.department) {
      return alert("Please manually select the correct department before continuing.");
    }

    localStorage.setItem("userPhone", form.phone);
    localStorage.setItem("grievanceForm", JSON.stringify(form));
    localStorage.setItem("predictedDept", form.department);
    localStorage.setItem("priority", priority);
    if (location) localStorage.setItem("location", JSON.stringify(location));
    if (address) localStorage.setItem("address", address);

    navigate("/details");
  };

  return (
    <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
      <div className="card shadow-lg p-4" style={{ maxWidth: "650px", borderRadius: "18px" }}>

        <h3 className="text-center text-primary">🚀 SAMYOG-AI</h3>

        {/* 🔥 MISMATCH WARNING BANNER */}
        {mismatchWarning && (
          <div className="alert alert-warning">
            <strong>⚠️ Mismatch detected:</strong> {mismatchWarning}
            <div className="mt-2">
              <label className="form-label mb-1">Please select the correct department:</label>
              <select
                className="form-select mb-2"
                name="department"
                value={form.department}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                <option>NHAI</option>
                <option>Railways</option>
                <option>Airport</option>
                <option>IncomeTax</option>
              </select>
              <button type="button" className="btn btn-warning w-100" onClick={proceedDespiteMismatch}>
                Confirm & Continue
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <input type="text" name="name" placeholder="Name" className="form-control mb-2" onChange={handleChange} required />

          <div className="input-group mb-2">
            <input type="text" name="phone" className="form-control" value={form.phone} onChange={handleChange} required />
            <button className="btn btn-warning" type="button" onClick={sendOtp}>OTP</button>
          </div>

          <input className="form-control mb-2" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <button type="button" className="btn btn-success mb-2" onClick={verifyOtp}>Verify</button>
          {isVerified && <div className="text-success mb-2">✅ Phone Verified</div>}

          {/* 🔥 Hint: text or image required, not both */}
          <small className="text-muted">Provide a description, an image, or both (at least one is required).</small>

          <textarea name="text" placeholder="Complaint (optional if you upload an image)" className="form-control mb-2 mt-1" onChange={handleChange} />

          <input type="file" accept="image/*" className="form-control mb-2" onChange={handleImageChange} />

          {preview && <img src={preview} alt="preview" className="img-fluid mb-2" />}

          <button type="button" className="btn btn-outline-secondary mb-2" onClick={getLocation}>
            📍 Get Location
          </button>
          {location && <div className="small text-muted mb-2">📍 Location captured</div>}

          <select className="form-select mb-3" name="department" value={form.department} onChange={handleChange}>
            <option value="">Auto Detect</option>
            <option>NHAI</option>
            <option>Railways</option>
            <option>Airport</option>
            <option>IncomeTax</option>
          </select>

          <button className="btn btn-primary w-100" disabled={!isVerified || loading}>
            {loading ? "Analyzing..." : "Submit"}
          </button>

        </form>
      </div>

      <div id="recaptcha-container"></div>
    </div>
  );
}

export default GrievanceForm;