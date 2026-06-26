function AdminPanel() {
  return (
    <div className="container mt-4">
      <h2>📋 SAMYOG-AI Admin Panel</h2>

      <p>Select a department:</p>

      <a href="/admin/nhai" className="btn btn-primary me-2">NHAI</a>
      <a href="/admin/railways" className="btn btn-success me-2">Railways</a>
      <a href="/admin/airport" className="btn btn-warning me-2">Airport</a>
      <a href="/admin/incometax" className="btn btn-dark">IncomeTax</a>
    </div>
  );
}