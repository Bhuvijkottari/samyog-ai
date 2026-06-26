import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";

function MapView() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/grievances"
        );
        setGrievances(res.data);
      } catch (err) {
        console.log("Map fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container mt-3">
      <h3 className="text-center mb-3">🗺️ Complaint Map View</h3>

      {loading ? (
        <p className="text-center">Loading map...</p>
      ) : (
        <MapContainer
          center={[12.9716, 77.5946]} // Bangalore default
          zoom={10}
          style={{ height: "70vh", width: "100%", borderRadius: "10px" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {grievances.map((g) => {
            if (!g.location || !g.location.lat || !g.location.lng) return null;

            return (
              <Marker
                key={g._id}
                position={[g.location.lat, g.location.lng]}
              >
                <Popup>
                  <div>
                    <strong>{g.name}</strong>
                    <br />
                    {g.text}
                    <br />
                    <b>Dept:</b> {g.department}
                    <br />
                    <b>Status:</b>{" "}
                    <span
                      style={{
                        color:
                          g.status === "Resolved" ? "green" : "orange"
                      }}
                    >
                      {g.status}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}

      {!loading && grievances.length === 0 && (
        <p className="text-center text-muted mt-3">
          No complaints with location found 📍
        </p>
      )}
    </div>
  );
}

export default MapView;