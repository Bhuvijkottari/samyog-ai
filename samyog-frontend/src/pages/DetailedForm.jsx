import React, { useState, useEffect } from "react";
import axios from "axios";

const subIssues = {
  NHAI: [
    "Pothole",
    "Road Damage",
    "Waterlogging",
    "Broken Divider",
    "Cracks",
    "Construction Delay"
  ],
  Railways: [
    "Track Damage",
    "Signal Failure",
    "Dirty Station",
    "Train Delay",
    "Ticket Issue"
  ],
  Airport: [
    "Flight Delay",
    "Baggage Issue",
    "Security Delay",
    "Staff Behavior",
    "Runway Issue"
  ],
  IncomeTax: [
    "Refund Issue",
    "Wrong Deduction",
    "Portal Error",
    "Login Issue"
  ]
};

function DetailedForm() {
  const [dept, setDept] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subIssue: "",
    description: "",
    severity: 5
  });

  useEffect(() => {
    const storedDept = localStorage.getItem("predictedDept");
    setDept(storedDept);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const baseForm = JSON.parse(localStorage.getItem("grievanceForm") || "{}");
    const location = localStorage.getItem("location");
    const address = localStorage.getItem("address");
    const priority = localStorage.getItem("priority");
    const priorityLevel = localStorage.getItem("priorityLevel");
    const textConfidence = localStorage.getItem("textConfidence");
    const imageConfidence = localStorage.getItem("imageConfidence");

    const formData = new FormData();
    formData.append("name", baseForm.name || "");
    formData.append("phone", baseForm.phone || "");
    formData.append("text", baseForm.text || "");
    formData.append("department", dept || baseForm.department || "");
    formData.append("subIssue", form.subIssue);
    formData.append("severity", form.severity);
    formData.append("description", form.description);
    formData.append("priority", priority || "LOW");
    formData.append("priorityLevel", priorityLevel || 1);
    formData.append("textConfidence", textConfidence || 0);
    formData.append("imageConfidence", imageConfidence || 0);
    if (location) formData.append("location", location);
    if (address) formData.append("address", address);

    try {
      await axios.post("http://localhost:5000/api/grievance/final", formData);

      // clean up localStorage now that submission is complete
      [
        "grievanceForm", "predictedDept", "priority", "priorityLevel",
        "textConfidence", "imageConfidence", "location", "address"
      ].forEach((k) => localStorage.removeItem(k));

      alert("✅ Grievance submitted successfully");
      window.location.href = "/user";
    } catch (err) {
      console.log(err);
      alert("❌ Submission failed");
    }

    setSubmitting(false);
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow">
        <h3 className="text-primary">📝 Additional Details</h3>

        <p><strong>Department:</strong> {dept}</p>

        <form onSubmit={handleSubmit}>

          <div className="mb-3">
            <label>Sub Issue</label>
            <select
              className="form-select"
              onChange={(e) =>
                setForm({ ...form, subIssue: e.target.value })
              }
              required
            >
              <option value="">Select Issue</option>
              {subIssues[dept]?.map((s, i) => (
                <option key={i}>{s}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label>Detailed Description</label>
            <textarea
              className="form-control"
              rows="3"
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </div>

          <div className="mb-3">
            <label>Severity (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              className="form-control"
              value={form.severity}
              onChange={(e) =>
                setForm({ ...form, severity: e.target.value })
              }
            />
          </div>

          <button className="btn btn-success w-100" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Details"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default DetailedForm;