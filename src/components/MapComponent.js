import React, { useState, useRef, useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    LayersControl,
    Polyline,
    Polygon,
    Circle,
    FeatureGroup,
    useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import axios from "axios";
import { FaMapMarkerAlt, FaTrash } from "react-icons/fa";

// Fix for Leaflet default icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const { BaseLayer } = LayersControl;

// Fix default icon issue
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Ikon untuk current location (hapus className untuk monokrom)
const CurrentLocationIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: "current-location-icon",
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapControls = ({ map }) => {
    const mapInstance = useMap();

    useEffect(() => {
        if (map.current) {
            map.current.leafletElement = mapInstance;
        }
    }, [mapInstance, map]);

    return null;
};

const CustomMapComponent = () => {
    const [markers, setMarkers] = useState([]);
    const [polylines, setPolylines] = useState([]);
    const [polygons, setPolygons] = useState([]);
    const [circles, setCircles] = useState([]);
    const [manualCoords, setManualCoords] = useState({ lat: "", lng: "" });
    const [markerName, setMarkerName] = useState("");
    const [currentLocation, setCurrentLocation] = useState(null);
    const [currentLocationDetails, setCurrentLocationDetails] = useState({ city: "Unknown", country: "Unknown" });
    const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const [locationSearchResults, setLocationSearchResults] = useState([]);

    const mapRef = useRef();
    const sidebarulinkRef = useRef();

    // Warna default untuk elemen (hanya grey, hapus object defaultColors)
    const defaultColor = "grey";

    // Fungsi untuk mengambil token
    const getAuthHeader = () => {
        const token = localStorage.getItem("authToken");
        return { Authorization: `Bearer ${token}` };
    };

    // Load data dari backend
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation([latitude, longitude]);
                    setMapCenter([latitude, longitude]);
                    const details = await fetchLocationDetails(latitude, longitude);
                    setCurrentLocationDetails(details);
                },
                (error) => {
                    console.error("Error getting location", error);
                }
            );
        }

        const fetchData = async () => {
            try {
                const [markersRes, polylinesRes, polygonsRes, circlesRes] = await Promise.all([
                    axios.get("http://localhost:5000/markers", { headers: getAuthHeader() }),
                    axios.get("http://localhost:5000/polylines", { headers: getAuthHeader() }),
                    axios.get("http://localhost:5000/polygons", { headers: getAuthHeader() }),
                    axios.get("http://localhost:5000/circles", { headers: getAuthHeader() }),
                ]);

                setMarkers(markersRes.data.map(marker => ({
                    ...marker,
                    lat: Number(marker.latitude),
                    lng: Number(marker.longitude),
                    id: marker.id.toString(),
                })));
                setPolylines(polylinesRes.data.map(polyline => ({
                    ...polyline,
                    points: JSON.parse(polyline.points),
                    id: polyline.id.toString(),
                })));
                setPolygons(polygonsRes.data.map(polygon => ({
                    ...polygon,
                    points: JSON.parse(polygon.points),
                    id: polygon.id.toString(),
                })));
                setCircles(circlesRes.data.map(circle => ({
                    ...circle,
                    center: JSON.parse(circle.center),
                    id: circle.id.toString(),
                })));
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const fetchLocationDetails = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            console.log("Nominatim Response:", data); // Tambahkan log untuk debugging
            return {
                city: data.address.city || data.address.town || data.address.village || data.address.hamlet || "Unknown",
                country: data.address.country || "Unknown",
                village: data.address.village || data.address.hamlet || "Not available",
                state: data.address.state || data.address.county || "Not available",
                suburb: data.address.suburb || data.address.neighbourhood || "Not available",
                road: data.address.road || "Not available",
            };
        } catch (error) {
            console.error("Location fetch error:", error);
            return {
                city: "Unknown",
                country: "Unknown",
                village: "Not available",
                state: "Not available",
                suburb: "Not available",
                road: "Not available",
            };
        }
    };

    const addManualMarker = async () => {
        if (!manualCoords.lat || !manualCoords.lng) {
            alert("Please enter valid coordinates");
            return;
        }
    
        setLoading(true);
        try {
            const lat = Number(manualCoords.lat);
            const lng = Number(manualCoords.lng);
    
            if (isNaN(lat) || isNaN(lng)) {
                alert("Please enter valid numerical coordinates");
                return;
            }
    
            const locationDetails = await fetchLocationDetails(lat, lng);
            const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
            const newMarker = {
                name: markerName || `${locationDetails.city || "Marker"} Location`,
                latitude: lat,
                longitude: lng,
                city: locationDetails.city,
                country: locationDetails.country,
                village: locationDetails.village,
                state: locationDetails.state,
                suburb: locationDetails.suburb,
                road: locationDetails.road,
                timestamp,
            };
    
            console.log("Location Details from fetchLocationDetails:", locationDetails);
            console.log("New Manual Marker Data Sent to Backend:", newMarker);
    
            const response = await axios.post("http://localhost:5000/markers", newMarker, {
                headers: getAuthHeader(),
            });
    
            console.log("Response from Backend:", response.data);
    
            // Ambil ulang markers dari backend
            await fetchMarkers();
    
            setManualCoords({ lat: "", lng: "" });
            setMarkerName("");
    
            if (mapRef.current && mapRef.current.leafletElement) {
                mapRef.current.leafletElement.setView([lat, lng], 13);
            }
        } catch (error) {
            console.error("Error adding marker:", error.response?.data || error.message);
            alert("Failed to add marker to database. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMarkers = async () => {
        try {
            const response = await axios.get("http://localhost:5000/markers", {
                headers: getAuthHeader(),
            });
            setMarkers(response.data.map(marker => ({
                ...marker,
                lat: Number(marker.latitude),
                lng: Number(marker.longitude),
            })));
        } catch (error) {
            console.error("Error fetching markers:", error);
        }
    };
    
    const handleMapClick = async (e) => {
        setLoading(true);
        try {
            const { lat, lng } = e.latlng;
            const locationDetails = await fetchLocationDetails(lat, lng);
            const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
            const newMarker = {
                name: markerName || `${locationDetails.city || "Marker"} Location`,
                latitude: lat,
                longitude: lng,
                city: locationDetails.city,
                country: locationDetails.country,
                village: locationDetails.village,
                state: locationDetails.state,
                suburb: locationDetails.suburb,
                road: locationDetails.road,
                timestamp,
            };
    
            console.log("Location Details from fetchLocationDetails:", locationDetails);
            console.log("New Marker Data Sent to Backend:", newMarker);
    
            const response = await axios.post("http://localhost:5000/markers", newMarker, {
                headers: getAuthHeader(),
            });
    
            console.log("Response from Backend:", response.data);
    
            // Ambil ulang markers dari backend
            await fetchMarkers();
        } catch (error) {
            console.error("Error adding marker:", error.response?.data || error.message);
            alert("Failed to add marker to database. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerDragEnd = async (e, markerId) => {
        setLoading(true);
        try {
            const { lat, lng } = e.target.getLatLng();
            const locationDetails = await fetchLocationDetails(lat, lng);
            const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
            const updatedMarker = {
                latitude: lat,
                longitude: lng,
                city: locationDetails.city,
                country: locationDetails.country,
                village: locationDetails.village,
                state: locationDetails.state,
                suburb: locationDetails.suburb,
                road: locationDetails.road,
                timestamp,
            };
    
            console.log("Location Details from fetchLocationDetails:", locationDetails);
            console.log("Updated Marker Data Sent to Backend:", updatedMarker);
    
            const response = await axios.put(`http://localhost:5000/markers/${markerId}`, updatedMarker, {
                headers: getAuthHeader(),
            });
    
            console.log("Response from Backend:", response.data);
    
            // Ambil ulang markers dari backend
            await fetchMarkers();
        } catch (error) {
            console.error("Error updating marker:", error.response?.data || error.message);
            alert("Failed to update marker in database. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    
    const deleteMarker = async (markerId) => {
        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/markers/${markerId}`, {
                headers: getAuthHeader(),
            });
            setMarkers((prev) => prev.filter((m) => m.id !== markerId));
        } catch (error) {
            console.error("Error deleting marker:", error);
        } finally {
            setLoading(false);
        }
    };

    const clearAllMarkers = async () => {
        if (window.confirm("Are you sure you want to delete all markers?")) {
            setLoading(true);
            try {
                await axios.delete("http://localhost:5000/markers", {
                    headers: getAuthHeader(),
                });
                setMarkers([]);
            } catch (error) {
                console.error("Error clearing markers:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const deletePolyline = async (polylineId) => {
        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/polylines/${polylineId}`, {
                headers: getAuthHeader(),
            });
            setPolylines((prev) => prev.filter((p) => p.id !== polylineId));
        } catch (error) {
            console.error("Error deleting polyline:", error);
            alert("Failed to delete polyline. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const deletePolygon = async (polygonId) => {
        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/polygons/${polygonId}`, {
                headers: getAuthHeader(),
            });
            setPolygons((prev) => prev.filter((p) => p.id !== polygonId));
        } catch (error) {
            console.error("Error deleting polygon:", error);
            alert("Failed to delete polygon. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const deleteCircle = async (circleId) => {
        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/circles/${circleId}`, {
                headers: getAuthHeader(),
            });
            setCircles((prev) => prev.filter((c) => c.id !== circleId));
        } catch (error) {
            console.error("Error deleting circle:", error);
            alert("Failed to delete circle. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const clearAllPolylines = async () => {
        if (window.confirm("Are you sure you want to delete all polylines?")) {
            setLoading(true);
            try {
                await axios.delete("http://localhost:5000/polylines", {
                    headers: getAuthHeader(),
                });
                setPolylines([]);
            } catch (error) {
                console.error("Error clearing polylines:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const clearAllPolygons = async () => {
        if (window.confirm("Are you sure you want to delete all polygons?")) {
            setLoading(true);
            try {
                await axios.delete("http://localhost:5000/polygons", {
                    headers: getAuthHeader(),
                });
                setPolygons([]);
            } catch (error) {
                console.error("Error clearing polygons:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const clearAllCircles = async () => {
        if (window.confirm("Are you sure you want to delete all circles?")) {
            setLoading(true);
            try {
                await axios.delete("http://localhost:5000/circles", {
                    headers: getAuthHeader(),
                });
                setCircles([]);
            } catch (error) {
                console.error("Error clearing circles:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleShapeCreated = async (e) => {
        setLoading(true);
        try {
            const { layer, layerType } = e;

            if (layerType === "marker") {
                const { lat, lng } = layer.getLatLng();
                const locationDetails = await fetchLocationDetails(lat, lng);
                const timestamp = new Date().toISOString();
                const newMarker = {
                    name: markerName || `${locationDetails.city || "Marker"} Location`,
                    latitude: lat,
                    longitude: lng,
                    ...locationDetails,
                    timestamp,
                };

                const response = await axios.post("http://localhost:5000/markers", newMarker, {
                    headers: getAuthHeader(),
                });

                setMarkers((prev) => [...prev, {
                    ...newMarker,
                    lat,
                    lng,
                    id: response.data.id.toString(),
                    timestamp,
                }]);
            } else if (layerType === "polyline") {
                const points = layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
                const timestamp = new Date().toISOString();
                const response = await axios.post("http://localhost:5000/polylines", { points, timestamp }, {
                    headers: getAuthHeader(),
                });

                setPolylines((prev) => [...prev, {
                    id: response.data.id.toString(),
                    points,
                    timestamp,
                }]);
            } else if (layerType === "polygon") {
                const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
                const timestamp = new Date().toISOString();
                const response = await axios.post("http://localhost:5000/polygons", { points, timestamp }, {
                    headers: getAuthHeader(),
                });

                setPolygons((prev) => [...prev, {
                    id: response.data.id.toString(),
                    points,
                    timestamp,
                }]);
            } else if (layerType === "circle") {
                const center = [layer.getLatLng().lat, layer.getLatLng().lng];
                const radius = layer.getRadius();
                const timestamp = new Date().toISOString();
                const response = await axios.post("http://localhost:5000/circles", { center, radius, timestamp }, {
                    headers: getAuthHeader(),
                });

                setCircles((prev) => [...prev, {
                    id: response.data.id.toString(),
                    center,
                    radius,
                    timestamp,
                }]);
            }
        } catch (error) {
            console.error("Error saving shape:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleShapeEdited = async (e) => {
        setLoading(true);
        try {
            const layers = e.layers;
            layers.eachLayer(async (layer) => {
                const layerId = layer.options.id; // Ambil ID dari options
                if (!layerId) {
                    console.error("Layer ID not found:", layer);
                    return;
                }

                const layerType = layer instanceof L.Polyline && !(layer instanceof L.Polygon) ? "polyline" :
                                 layer instanceof L.Polygon ? "polygon" :
                                 layer instanceof L.Circle ? "circle" : null;

                if (!layerType) {
                    console.error("Unknown layer type:", layer);
                    return;
                }

                if (layerType === "polyline") {
                    const points = layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
                    const timestamp = new Date().toISOString();
                    await axios.put(`http://localhost:5000/polylines/${layerId}`, { points, timestamp }, {
                        headers: getAuthHeader(),
                    });
                    setPolylines((prev) =>
                        prev.map((p) =>
                            p.id === layerId ? { ...p, points, timestamp } : p
                        )
                    );
                } else if (layerType === "polygon") {
                    const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
                    const timestamp = new Date().toISOString();
                    await axios.put(`http://localhost:5000/polygons/${layerId}`, { points, timestamp }, {
                        headers: getAuthHeader(),
                    });
                    setPolygons((prev) =>
                        prev.map((p) =>
                            p.id === layerId ? { ...p, points, timestamp } : p
                        )
                    );
                } else if (layerType === "circle") {
                    const center = [layer.getLatLng().lat, layer.getLatLng().lng];
                    const radius = layer.getRadius();
                    const timestamp = new Date().toISOString();
                    await axios.put(`http://localhost:5000/circles/${layerId}`, { center, radius, timestamp }, {
                        headers: getAuthHeader(),
                    });
                    setCircles((prev) =>
                        prev.map((c) =>
                            c.id === layerId ? { ...c, center, radius, timestamp } : c
                        )
                    );
                }
            });
        } catch (error) {
            console.error("Error updating shape:", error);
            alert("Failed to update shape. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleShapeDeleted = async (e) => {
        setLoading(true);
        try {
            const layers = e.layers;
            layers.eachLayer(async (layer) => {
                const layerId = layer.options.id; // Ambil ID dari options
                if (!layerId) {
                    console.error("Layer ID not found for deletion:", layer);
                    return;
                }

                const layerType = layer instanceof L.Polyline && !(layer instanceof L.Polygon) ? "polyline" :
                                 layer instanceof L.Polygon ? "polygon" :
                                 layer instanceof L.Circle ? "circle" : null;

                if (!layerType) {
                    console.error("Unknown layer type for deletion:", layer);
                    return;
                }

                if (layerType === "polyline") {
                    await deletePolyline(layerId);
                } else if (layerType === "polygon") {
                    await deletePolygon(layerId);
                } else if (layerType === "circle") {
                    await deleteCircle(layerId);
                }
            });
        } catch (error) {
            console.error("Error deleting shape:", error);
            alert("Failed to delete shape. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const goToCurrentLocation = () => {
        if (currentLocation && mapRef.current && mapRef.current.leafletElement) {
            mapRef.current.leafletElement.setView(currentLocation, 13);
        }
    };

    const handleLocationSearch = async (query) => {
        if (!query) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
            );
            const data = await response.json();
            setLocationSearchResults(data);
        } catch (error) {
            console.error("Location search error:", error);
        }
    };

    const handleLocationSelect = (lat, lon) => {
        setMapCenter([lat, lon]);
        if (mapRef.current && mapRef.current.leafletElement) {
            mapRef.current.leafletElement.setView([lat, lon], 13);
        }
        setLocationSearchResults([]);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <div style={{ display: "flex", height: "100vh" }}>
                <div
                    ref={sidebarulinkRef}
                    style={{
                        width: showSidebar ? "240px" : "40px",
                        padding: showSidebar ? "20px" : "10px 0",
                        borderRight: "1px solid #e5e5e5",
                        backgroundColor: "#F5F5F5", // Abu-abu terang untuk background
                        overflowY: showSidebar ? "auto" : "hidden",
                        transition: "width 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                    onMouseEnter={() => setShowSidebar(true)}
                    onMouseLeave={() => setShowSidebar(false)}
                >
                    <div
                        style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            cursor: "pointer",
                            marginBottom: showSidebar ? "20px" : "0",
                        }}
                    >
                        {showSidebar ? " " : "☰"} {/* Ubah ikon jadi × saat sidebar terbuka */}
                    </div>

                    {showSidebar && (
                        <>
                            {loading && (
                                <div style={{ marginBottom: "15px", textAlign: "center" }}>
                                    <span style={{ color: "#666", fontSize: "13px" }}>Loading...</span>
                                </div>
                            )}

                            <div style={{ width: "100%" }}>
                                <div style={{ marginBottom: "25px" }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: "8px",
                                            fontWeight: "600",
                                            fontSize: "13px",
                                            color: "#333",
                                        }}
                                    >
                                        Add Marker
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Marker Name (e.g., Pusat Kota)"
                                        value={markerName}
                                        onChange={(e) => setMarkerName(e.target.value)}
                                        style={{
                                            width: "93%",
                                            padding: "8px",
                                            border: "1px solid #E0E0E0",
                                            borderRadius: "4px",
                                            marginBottom: "8px",
                                            fontSize: "13px",
                                            backgroundColor: "#FFFFFF",
                                            color: "#333",
                                            outline: "none",
                                        }}
                                    />
                                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                        <input
                                            type="text"
                                            placeholder="Latitude"
                                            value={manualCoords.lat}
                                            onChange={(e) => setManualCoords((prev) => ({ ...prev, lat: e.target.value }))}
                                            style={{
                                                width: "50%",
                                                padding: "8px",
                                                border: "1px solid #E0E0E0",
                                                borderRadius: "4px",
                                                fontSize: "13px",
                                                backgroundColor: "#FFFFFF",
                                                color: "#333",
                                                outline: "none",
                                            }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Longitude"
                                            value={manualCoords.lng}
                                            onChange={(e) => setManualCoords((prev) => ({ ...prev, lng: e.target.value }))}
                                            style={{
                                                width: "50%",
                                                padding: "8px",
                                                border: "1px solid #E0E0E0",
                                                borderRadius: "4px",
                                                fontSize: "13px",
                                                backgroundColor: "#FFFFFF",
                                                color: "#333",
                                                outline: "none",
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={addManualMarker}
                                        disabled={loading}
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            backgroundColor: "#313131", // Warna tombol monokrom
                                            color: "#FFFFFF",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            opacity: loading ? 0.5 : 1,
                                            fontSize: "13px",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseEnter={(e) => (e.target.style.backgroundColor = "#4A4A4A")} // Hover effect
                                        onMouseLeave={(e) => (e.target.style.backgroundColor = "#313131")}
                                    >
                                        Add Marker 
                                    </button>
                                </div>

                                <div style={{ marginBottom: "25px" }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: "8px",
                                            fontWeight: "600",
                                            fontSize: "13px",
                                            color: "#333",
                                        }}
                                    >
                                        Saved Markers
                                    </label>
                                    {markers.length === 0 ? (
                                        <p style={{ color: "#777", fontSize: "13px" }}>No markers saved yet.</p>
                                    ) : (
                                        <div
                                            style={{
                                                maxHeight: "200px",
                                                overflowY: "auto",
                                                border: "1px solid #E5E5E5",
                                                borderRadius: "4px",
                                                backgroundColor: "#FFFFFF",
                                            }}
                                        >
                                            {markers.map((marker) => (
                                                <div
                                                    key={marker.id}
                                                    style={{
                                                        padding: "10px",
                                                        borderBottom: "1px solid #E5E5E5",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <div>
                                                        <p
                                                            style={{
                                                                margin: "0 0 3px 0",
                                                                fontWeight: "600",
                                                                fontSize: "13px",
                                                                color: "#333",
                                                            }}
                                                        >
                                                            {marker.name || `Marker ${marker.id}`}
                                                        </p>
                                                        <p style={{ margin: "0 0 3px 0", fontSize: "12px", color: "#666" }}>
                                                            {marker.city}, {marker.country}
                                                        </p>
                                                        <p style={{ margin: 0, fontSize: "11px", color: "#999" }}>
                                                            Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteMarker(marker.id)}
                                                        style={{
                                                            backgroundColor: "transparent",
                                                            border: "none",
                                                            color: "#313131",
                                                            fontSize: "16px",
                                                            cursor: "pointer",
                                                            padding: "5px 10px",
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={clearAllMarkers}
                                        disabled={loading || markers.length === 0}
                                        style={{
                                            width: "100%",
                                            marginTop: "10px",
                                            padding: "8px",
                                            backgroundColor: "#313131",
                                            color: "#FFFFFF",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            opacity: loading || markers.length === 0 ? 0.5 : 1,
                                            fontSize: "13px",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseEnter={(e) => (e.target.style.backgroundColor = "#4A4A4A")}
                                        onMouseLeave={(e) => (e.target.style.backgroundColor = "#313131")}
                                    >
                                        Clear All Markers 
                                    </button>
                                </div>

                                <div style={{ marginBottom: "25px" }}>
                                    <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                                        Use drawing tools on the map to create shapes. Shapes are auto-saved.
                                    </p>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                        <div>
                                            <h3
                                                style={{
                                                    margin: "0 0 8px 0",
                                                    fontSize: "13px",
                                                    fontWeight: "600",
                                                    color: "#333",
                                                }}
                                            >
                                                Polylines ({polylines.length})
                                            </h3>
                                            <button
                                                onClick={clearAllPolylines}
                                                disabled={loading || polylines.length === 0}
                                                style={{
                                                    width: "100%",
                                                    padding: "8px",
                                                    backgroundColor: "#313131",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    opacity: loading || polylines.length === 0 ? 0.5 : 1,
                                                    fontSize: "13px",
                                                    transition: "background-color 0.2s",
                                                }}
                                                onMouseEnter={(e) => (e.target.style.backgroundColor = "#4A4A4A")}
                                                onMouseLeave={(e) => (e.target.style.backgroundColor = "#313131")}
                                            >
                                                Clear All Polylines
                                            </button>
                                        </div>

                                        <div>
                                            <h3
                                                style={{
                                                    margin: "0 0 8px 0",
                                                    fontSize: "13px",
                                                    fontWeight: "600",
                                                    color: "#333",
                                                }}
                                            >
                                                Polygons ({polygons.length})
                                            </h3>
                                            <button
                                                onClick={clearAllPolygons}
                                                disabled={loading || polygons.length === 0}
                                                style={{
                                                    width: "100%",
                                                    padding: "8px",
                                                    backgroundColor: "#313131",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    opacity: loading || polygons.length === 0 ? 0.5 : 1,
                                                    fontSize: "13px",
                                                    transition: "background-color 0.2s",
                                                }}
                                                onMouseEnter={(e) => (e.target.style.backgroundColor = "#4A4A4A")}
                                                onMouseLeave={(e) => (e.target.style.backgroundColor = "#313131")}
                                            >
                                                Clear All Polygons
                                            </button>
                                        </div>

                                        <div>
                                            <h3
                                                style={{
                                                    margin: "0 0 8px 0",
                                                    fontSize: "13px",
                                                    fontWeight: "600",
                                                    color: "#333",
                                                }}
                                            >
                                                Circles ({circles.length})
                                            </h3>
                                            <button
                                                onClick={clearAllCircles}
                                                disabled={loading || circles.length === 0}
                                                style={{
                                                    width: "100%",
                                                    padding: "8px",
                                                    backgroundColor: "#313131",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    opacity: loading || circles.length === 0 ? 0.5 : 1,
                                                    fontSize: "13px",
                                                    transition: "background-color 0.2s",
                                                }}
                                                onMouseEnter={(e) => (e.target.style.backgroundColor = "#4A4A4A")}
                                                onMouseLeave={(e) => (e.target.style.backgroundColor = "#313131")}
                                            >
                                                Clear All Circles
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                                        🔘 Map data is saved automatically to your MySQL database.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ flex: 1, height: "100%" }}>
                    <MapContainer
                        center={mapCenter}
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                        ref={mapRef}
                        whenCreated={(map) => {
                            map.on("click", handleMapClick);
                        }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        <LayersControl position="bottomright">
                            <BaseLayer name="OpenStreetMap">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            </BaseLayer>
                            <BaseLayer name="Google Roadmap">
                                <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
                            </BaseLayer>
                            <BaseLayer name="Google Satellite">
                                <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
                            </BaseLayer>
                            <BaseLayer name="Google Terrain">
                                <TileLayer url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" />
                            </BaseLayer>
                            <BaseLayer name="Google Hybrid">
                                <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
                            </BaseLayer>
                            <BaseLayer name="Esri World Imagery">
                                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            </BaseLayer>
                            <BaseLayer checked name="CartoDB Positron">
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                            </BaseLayer>
                        </LayersControl>

                        {markers.map((marker) => (
                            <Marker
                                key={marker.id}
                                position={[marker.lat, marker.lng]}
                                draggable={true}
                                eventHandlers={{
                                    dragend: (e) => handleMarkerDragEnd(e, marker.id),
                                }}
                            >
                                <Popup>
                                    <div style={{ textAlign: "center" }}>
                                        <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                                            {marker.city !== "Unknown" ? marker.city : "Unknown Location"}, {marker.country}
                                        </h3>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                            Village: {marker.village}
                                        </p>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                            {marker.name || `Marker ${marker.id}`}
                                        </p>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                            Province: {marker.state}
                                        </p>
                                        {marker.suburb !== "Not available" && (
                                            <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                                Suburb: {marker.suburb}
                                            </p>
                                        )}
                                        {marker.road !== "Not available" && (
                                            <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                                Road: {marker.road}
                                            </p>
                                        )}
                                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
                                            Lat: {Number(marker.lat).toFixed(6)}, Lng: {Number(marker.lng).toFixed(6)}
                                        </p>
                                        {marker.timestamp && (
                                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                                                Added: {new Date(marker.timestamp).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                        <button
                                            onClick={() => deleteMarker(marker.id)}
                                            style={{
                                                backgroundColor: "transparent",
                                                border: "none",
                                                color: "#313131", // Ubah ke monokrom
                                                fontSize: "16px",
                                                cursor: "pointer",
                                                padding: "5px",
                                            }}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {polylines.map((polyline) => (
                            <Polyline
                                key={polyline.id}
                                positions={polyline.points}
                                color={defaultColor}
                                weight={3}
                                opacity={0.7}
                                options={{ id: polyline.id }} // Pastikan ID disimpan di options
                            >
                                <Popup>
                                    <div style={{ textAlign: "center" }}>
                                        <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                                            Polyline
                                        </h3>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
                                            Points: {polyline.points.length}
                                        </p>
                                        {polyline.timestamp && (
                                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                                                Added: {new Date(polyline.timestamp).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                            <button
                                                onClick={() => deletePolyline(polyline.id)}
                                                style={{
                                                    backgroundColor: "transparent",
                                                    border: "none",
                                                    color: "#313131", // Ubah ke monokrom
                                                    fontSize: "16px",
                                                    cursor: "pointer",
                                                    padding: "5px",
                                                }}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Polyline>
                        ))}

                        {polygons.map((polygon) => (
                            <Polygon
                                key={polygon.id}
                                positions={polygon.points}
                                color={defaultColor}
                                weight={2}
                                opacity={0.5}
                                fillOpacity={0.2}
                                options={{ id: polygon.id }} // Pastikan ID disimpan di options
                            >
                                <Popup>
                                    <div style={{ textAlign: "center" }}>
                                        <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                                            Polygon
                                        </h3>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
                                            Points: {polygon.points.length}
                                        </p>
                                        {polygon.timestamp && (
                                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                                                Added: {new Date(polygon.timestamp).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                            <button
                                                onClick={() => deletePolygon(polygon.id)}
                                                style={{
                                                    backgroundColor: "transparent",
                                                    border: "none",
                                                    color: "#313131", // Ubah ke monokrom
                                                    fontSize: "16px",
                                                    cursor: "pointer",
                                                    padding: "5px",
                                                }}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Polygon>
                        ))}

                        {circles.map((circle) => (
                            <Circle
                                key={circle.id}
                                center={circle.center}
                                radius={circle.radius}
                                color={defaultColor}
                                weight={2}
                                opacity={0.7}
                                fillOpacity={0.2}
                                options={{ id: circle.id }} // Pastikan ID disimpan di options
                            >
                                <Popup>
                                    <div style={{ textAlign: "center" }}>
                                        <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                                            Circle
                                        </h3>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
                                            Radius: {circle.radius.toFixed(2)} m
                                        </p>
                                        {circle.timestamp && (
                                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                                                Added: {new Date(circle.timestamp).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                            <button
                                                onClick={() => deleteCircle(circle.id)}
                                                style={{
                                                    backgroundColor: "transparent",
                                                    border: "none",
                                                    color: "#313131", // Ubah ke monokrom
                                                    fontSize: "16px",
                                                    cursor: "pointer",
                                                    padding: "5px",
                                                }}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Circle>
                        ))}

                        <FeatureGroup>
                            <EditControl
                                position="topright"
                                onCreated={handleShapeCreated}
                                onEdited={handleShapeEdited}
                                onDeleted={handleShapeDeleted} // Tambahkan event handler untuk hapus
                                draw={{
                                    rectangle: false,
                                    circlemarker: false,
                                    marker: true,
                                    polyline: { shapeOptions: { color: defaultColor, weight: 3 } },
                                    polygon: { shapeOptions: { color: defaultColor, weight: 2 }, allowIntersection: false },
                                    circle: { shapeOptions: { color: defaultColor, weight: 2 } },
                                }}
                            />
                        </FeatureGroup>
                        <MapControls map={mapRef} />

                        {currentLocation && (
                            <>
                                <Marker
                                    position={currentLocation}
                                    icon={CurrentLocationIcon}
                                >
                                    <Popup>
                                        <div style={{ textAlign: "center" }}>
                                            <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                                                You're Here! 🙌
                                            </h3>
                                            <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                                {currentLocationDetails.city}, {currentLocationDetails.country}
                                            </p>
                                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                                                Lat: {currentLocation[0].toFixed(6)}, Lng: {currentLocation[1].toFixed(6)}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "210px",
                                        right: "10px",
                                        zIndex: 1000,
                                    }}
                                >
                                    <button
                                        onClick={goToCurrentLocation}
                                        style={{
                                            backgroundColor: "#313131",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            padding: "8px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <FaMapMarkerAlt />
                                    </button>
                                </div>
                            </>
                        )}
                    </MapContainer>

                    <div
                        style={{
                            position: "absolute",
                            bottom: "26px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "80%",
                            maxWidth: "600px",
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            height: "50px",
                            zIndex: 1000,
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search for a location..."
                            value={locationSearch}
                            onChange={(e) => {
                                setLocationSearch(e.target.value);
                                handleLocationSearch(e.target.value);
                            }}
                            style={{
                                padding: "10px",
                                border: "none",
                                borderBottom: "1px solid #eee",
                                borderRadius: "8px 8px 0 0",
                                fontSize: "14px",
                            }}
                        />
                        {locationSearchResults.length > 0 && (
                            <div
                                style={{
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    borderTop: "1px solid #eee",
                                }}
                            >
                                {locationSearchResults.map((result) => (
                                    <div
                                        key={result.place_id}
                                        onClick={() => handleLocationSelect(result.lat, result.lon)}
                                        style={{
                                            padding: "10px",
                                            cursor: "pointer",
                                            borderBottom: "1px solid #eee",
                                        }}
                                    >
                                        {result.display_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomMapComponent;