import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const [phone, setPhone] = useState("");
  const [grievances, setGrievances] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const navigate = useNavigate();

  // AUTO LOAD PHONE
  useEffect(() => {
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) setPhone(savedPhone);
  }, []);

  // FETCH DATA
  const fetchUserGrievances = async () => {
    if (!phone) return;

    try {
      const res = await axios.get(
        `http://localhost:5000/api/grievances?phone=${phone}`
      );

      setGrievances(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchUserGrievances();
  }, [phone]);

  // FILTER LOGIC
  useEffect(() => {
    let data = [...grievances];

    if (statusFilter !== "All") {
      data = data.filter((g) => g.status === statusFilter);
    }

    if (priorityFilter !== "All") {
      data = data.filter((g) => g.priority === priorityFilter);
    }

    setFiltered(data);
  }, [statusFilter, priorityFilter, grievances]);

  // STATS
  const total = grievances.length;
  const pending = grievances.filter((g) => g.status !== "Resolved").length;
  const resolved = grievances.filter((g) => g.status === "Resolved").length;

  return (
    <div className="container mt-4">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary">👤 User Dashboard</h2>

        <button
          className="btn btn-success shadow-sm"
          onClick={() => navigate("/submit")}
        >
          ➕ Submit Grievance
        </button>
      </div>

      {/* PHONE INPUT */}
      <div className="card p-3 shadow-sm mb-4">
        <label className="fw-semibold mb-2">Search by Phone</label>
        <input
          type="text"
          className="form-control"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* STATS */}
      {phone && (
        <div className="row text-center mb-4">
          <div className="col-md-4">
            <div className="card p-3 shadow-sm">
              <h6>Total</h6>
              <h3>{total}</h3>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card p-3 shadow-sm text-warning">
              <h6>Pending</h6>
              <h3>{pending}</h3>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card p-3 shadow-sm text-success">
              <h6>Resolved</h6>
              <h3>{resolved}</h3>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      {phone && (
        <div className="card p-3 shadow-sm mb-4">
          <div className="row">
            <div className="col-md-6">
              <label>Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All</option>
                <option>Pending</option>
                <option>Resolved</option>
              </select>
            </div>

            <div className="col-md-6">
              <label>Priority</label>
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option>All</option>
                <option>HIGH</option>
                <option>MEDIUM</option>
                <option>LOW</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {filtered.length === 0 ? (
        <div className="text-center text-muted">
          No complaints found 🚫
        </div>
      ) : (
        filtered.map((g) => (
          <div
            key={g._id}
            className="card mb-3 shadow-sm"
            style={{
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

              <div className="d-flex justify-content-between">
                <h6 className="fw-bold">{g.text}</h6>
                <span className="badge bg-info">{g.status}</span>
              </div>

              <p><b>Department:</b> {g.department}</p>

              <p><b>Priority:</b> {g.priority}</p>

            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default UserDashboard;