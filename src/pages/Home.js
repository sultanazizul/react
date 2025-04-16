import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css"; // Pastikan file CSS sudah ada

const Home = () => {
  const mapRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Cek apakah pengguna sudah login
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsLoggedIn(true);
    }

    // Inisialisasi peta
    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        center: [-8.4095, 115.1889], // Koordinat contoh (Bali)
        zoom: 10,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://carto.com/">CartoDB</a>',
        subdomains: "abcd",
      }).addTo(mapRef.current);
    }

    // Cleanup saat komponen di-unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="landing-container">
      {/* Header */}
      <div className="header">
        <div className="logo">
          <img src="/logo-bumi.png" alt="Logo Bumi" />
        </div>
        <nav className="auth-links">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button
                onClick={() => {
                  localStorage.removeItem("authToken");
                  setIsLoggedIn(false);
                  window.location.reload(); // Refresh untuk memperbarui status
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  cursor: "pointer",
                  padding: "0 10px",
                  fontSize: "16px",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="content">
        <p>
          Gunakan aplikasi ini untuk menjelajahi peta interaktif dengan mudah dan cepat.
          Temukan lokasi.
        </p>
      </div>

      {/* Map */}
      <div className="map-container">
        <div id="map"></div>
      </div>
    </div>
  );
};

export default Home;