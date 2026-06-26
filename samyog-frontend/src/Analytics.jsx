import { useEffect, useState } from "react";
import axios from "axios";

function Analytics() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/grievances")
      .then((res) => setData(res.data))
      .catch((err) => console.log(err));
  }, []);

  // 📊 FIX: normalize status (VERY IMPORTANT)
  const total = data.length;

  const resolved = data.filter(
    (d) => (d.status || "").toLowerCase() === "resolved"
  ).length;

  const pending = data.filter(
    (d) => (d.status || "").toLowerCase() !== "resolved"
  ).length;

  // 🏢 Department stats
  const deptCount = {
    NHAI: 0,
    Railways: 0,
    Airport: 0,
    IncomeTax: 0,
  };

  data.forEach((d) => {
    if (deptCount[d.department] !== undefined) {
      deptCount[d.department]++;
    }
  });

  return (
    <div className="container mt-4">
      <h3 className="text-center mb-4">📊 Analytics Dashboard</h3>

      {/* 📌 Summary Cards */}
      <div className="row text-center mb-4">
        <div className="col">
          <div className="p-3 bg-primary text-white rounded">
            Total<br />{total}
          </div>
        </div>

        <div className="col">
          <div className="p-3 bg-warning text-dark rounded">
            Pending<br />{pending}
          </div>
        </div>

        <div className="col">
          <div className="p-3 bg-success text-white rounded">
            Resolved<br />{resolved}
          </div>
        </div>
      </div>

      {/* 🏢 Department Stats */}
      <h5 className="mb-2">Complaints per Department</h5>

      <ul className="list-group">
        <li className="list-group-item">NHAI: {deptCount.NHAI}</li>
        <li className="list-group-item">Railways: {deptCount.Railways}</li>
        <li className="list-group-item">Airport: {deptCount.Airport}</li>
        <li className="list-group-item">IncomeTax: {deptCount.IncomeTax}</li>
      </ul>
    </div>
  );
}

export default Analytics;