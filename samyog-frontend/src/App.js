import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";

import GrievanceForm from "./pages/GrievanceForm";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DetailedForm from "./pages/DetailedForm"; // ✅ NEW

import MapView from "./MapView";
import Analytics from "./Analytics";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ========================= */}
        {/* 👤 USER ROUTES */}
        {/* ========================= */}

        <Route path="/" element={<UserDashboard />} />
        <Route path="/submit" element={<GrievanceForm />} />

        {/* ❌ REMOVE old direct redirect usage */}
        <Route path="/user" element={<UserDashboard />} />

        {/* ✅ NEW STEP-2 FORM */}
        <Route path="/details" element={<DetailedForm />} />

        {/* ========================= */}
        {/* 🏢 ADMIN ROUTES */}
        {/* ========================= */}

        <Route path="/admin/nhai" element={<AdminDashboard department="NHAI" />} />
        <Route path="/admin/railways" element={<AdminDashboard department="Railways" />} />
        <Route path="/admin/airport" element={<AdminDashboard department="Airport" />} />
        <Route path="/admin/incometax" element={<AdminDashboard department="IncomeTax" />} />

        {/* ========================= */}
        {/* 🌍 OPTIONAL */}
        {/* ========================= */}

        <Route path="/map" element={<MapView />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* ========================= */}
        {/* ❌ FALLBACK */}
        {/* ========================= */}

        <Route path="*" element={<UserDashboard />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;