import { useState } from "react";
import axios from "axios";

function GrievanceForm() {
   const [image, setImage] = useState(null);
   const [location, setLocation] = useState(null);
const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    text: "",
    department: ""
  });
  const getLocation = () => {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    },
    (err) => {
      console.log(err);
      alert("Location access denied");
    }
  );
};
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };
  const handleImageChange = (e) => {
  const file = e.target.files[0];
  setImage(file);

  if (file) {
    setPreview(URL.createObjectURL(file));
  }
};

 const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();

  formData.append("name", form.name);
  formData.append("phone", form.phone);
  formData.append("text", form.text);
  formData.append("department", form.department);
  formData.append("image", image);

  if (location) {
    formData.append("location", JSON.stringify(location));
  }

  try {
    const res = await axios.post(
      "http://localhost:5000/api/grievance",
      formData
    );

    alert("Submitted Successfully 🚀");
  } catch (err) {
    console.log(err);
  }
};

  return (
    <div className="container mt-5">
      <h2>SAMYOG-AI Grievance Form</h2>

      <form onSubmit={handleSubmit}>

        {/* Name */}
        <input
          type="text"
          name="name"
          placeholder="Enter Name"
          className="form-control mb-3"
          onChange={handleChange}
        />

        {/* Phone */}
        <div className="d-flex mb-3">
  <input
    type="text"
    name="phone"
    placeholder="Enter Phone Number"
    className="form-control me-2"
    onChange={handleChange}
  />

  <button
    type="button"
    className="btn btn-warning"
    onClick={() => alert("OTP Sent (demo)")}
  >
    Send OTP
  </button>
</div>


        {/* Complaint */}
        <textarea
          name="text"
          placeholder="Describe your issue..."
          className="form-control mb-3"
          onChange={handleChange}
        />
        <input
  type="file"
  className="form-control mb-3"
  onChange={handleImageChange}
/>

{preview && (
  <img
    src={preview}
    alt="preview"
    style={{ width: "200px", marginBottom: "10px" }}
  />
)}
<button
  type="button"
  className="btn btn-secondary mb-3"
  onClick={getLocation}
>
  Get Location
</button>

{location && (
  <p>
    📍 {location.lat}, {location.lng}
  </p>
)}

        {/* Department */}
        <select
          name="department"
          className="form-control mb-3"
          onChange={handleChange}
        >
          <option value="">Select Department (Optional)</option>
          <option>NHAI</option>
          <option>Railways</option>
          <option>Airports</option>
          <option>Income Tax</option>
        </select>

        <button className="btn btn-primary">Submit</button>

      </form>
    </div>
  );
}

export default GrievanceForm;