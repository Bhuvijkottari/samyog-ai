import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminDashboard = ({ department }) => {
  const [grievances, setGrievances] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const fetchData = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/grievances?department=${department}`
      );
      setGrievances(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (department) fetchData();
  }, [department]);

  const sortedGrievances = [...grievances].sort((a, b) => {
    return (
      (b.priorityLevel || 1) - (a.priorityLevel || 1) ||
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  });

  const filteredData = sortedGrievances.filter((g) => {
    return (
      (!statusFilter || g.status === statusFilter) &&
      (!priorityFilter || g.priority === priorityFilter)
    );
  });

  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:5000/api/grievance/${id}`,
        { status }
      );
      fetchData();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary">
          📋 {department} Admin Dashboard
        </h2>
      </div>

      <div className="row mb-3">
        <div className="col-md-4">
          <select
            className="form-select"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Resolved</option>
            <option>Escalated</option>
            <option>Closed</option>
          </select>
        </div>

        <div className="col-md-4">
          <select
            className="form-select"
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priority</option>
            <option>HIGH</option>
            <option>MEDIUM</option>
            <option>LOW</option>
          </select>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center text-muted">
          No complaints found 🚫
        </div>
      ) : (
        filteredData.map((g) => (
          <div
            key={g._id}
            className="card mb-3 shadow-sm"
            style={{
              borderRadius: "14px",
              borderLeft: `6px solid ${
                g.priorityLevel === 3
                  ? "red"
                  : g.priorityLevel === 2
                  ? "orange"
                  : "green"
              }`
            }}
          >
            <div className="card-body">

              <h5 className="fw-bold">{g.name}</h5>

              <p><strong>📝 Complaint:</strong> {g.text}</p>

              <p>
                <strong>🏢 Department:</strong>{" "}
                <span className="text-primary">{g.department}</span>
              </p>

              {/* 🔥 NEW FIELDS */}
              <p>
                <strong>📂 Sub Issue:</strong>{" "}
                {g.subIssue || "Not Provided"}
              </p>

              <p>
                <strong>⚠ Severity:</strong>{" "}
                {g.severity || "N/A"} / 10
              </p>

              <p>
                <strong>📄 Detailed Description:</strong>{" "}
                {g.description || "No Description"}
              </p>

              {g.address && (
                <p>
                  <strong>📍 Location:</strong> {g.address}
                </p>
              )}

              {!g.address && g.location && (
                <p>
                  <strong>📍 Location:</strong>{" "}
                  {g.location.lat}, {g.location.lng}
                </p>
              )}

              {g.predictionMismatch && (
                <p className="text-warning fw-bold">
                  ⚠️ Text/Image mismatch flagged at submission (user manually confirmed department)
                </p>
              )}

              {(g.textConfidence > 0 || g.imageConfidence > 0) && (
                <p className="small text-muted">
                  🤖 AI confidence — text: {(g.textConfidence * 100).toFixed(0)}%
                  {g.imageConfidence > 0 && ` | image: ${(g.imageConfidence * 100).toFixed(0)}%`}
                </p>
              )}

              {g.image && (
                <img
                  src={`http://localhost:5000/uploads/${g.image}`}
                  alt="complaint"
                  style={{
                    width: "200px",
                    borderRadius: "10px",
                    marginBottom: "10px"
                  }}
                />
              )}

              <p>
                <strong>🚨 Priority:</strong>{" "}
                <span
                  className={
                    g.priorityLevel === 3
                      ? "text-danger fw-bold"
                      : g.priorityLevel === 2
                      ? "text-warning fw-bold"
                      : "text-success fw-bold"
                  }
                >
                  {g.priority}
                </span>
              </p>

              <p>
                <strong>📌 Status:</strong>{" "}
                <span className="badge bg-warning text-dark">
                  {g.status}
                </span>
              </p>

              {g.isFraud && (
                <p className="text-danger fw-bold">
                  🚨 Fraud Suspicion Detected
                </p>
              )}

              <p className="text-muted small">
                🕒 {new Date(g.createdAt).toLocaleString()}
              </p>

              <div className="mt-2 d-flex gap-2 flex-wrap">
                {g.status !== "Resolved" && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => updateStatus(g._id, "Resolved")}
                  >
                    ✅ Resolve
                  </button>
                )}

                {g.status === "Resolved" && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => updateStatus(g._id, "Closed")}
                  >
                    🔒 Close
                  </button>
                )}
              </div>

            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminDashboard;