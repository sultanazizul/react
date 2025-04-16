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
import { FaMapMarkerAlt, FaUserAlt } from "react-icons/fa";

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
    const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const [locationSearchResults, setLocationSearchResults] = useState([]);

    const mapRef = useRef();
    const sidebarRef = useRef();

    // Fungsi untuk mengambil token
    const getAuthHeader = () => {
        const token = localStorage.getItem("authToken");
        return { Authorization: `Bearer ${token}` };
    };

    // Load data dari backend
    useEffect(() => {
        // Get current location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation([latitude, longitude]);
                    setMapCenter([latitude, longitude]);
                },
                (error) => {
                    console.error("Error getting location", error);
                }
            );
        }

        // Load data dari backend
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
                    lat: marker.latitude,
                    lng: marker.longitude,
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

    // Helper function to fetch location details
    const fetchLocationDetails = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
            );
            const data = await response.json();
            return {
                city: data.address.city || data.address.town || data.address.village || data.address.hamlet || "Unknown",
                country: data.address.country || "Unknown",
            };
        } catch (error) {
            console.error("Location fetch error:", error);
            return { city: "Unknown", country: "Unknown" };
        }
    };

    // Add a manual marker
    const addManualMarker = async () => {
        if (!manualCoords.lat || !manualCoords.lng) {
            alert("Please enter valid coordinates");
            return;
        }

        setLoading(true);
        try {
            const lat = parseFloat(manualCoords.lat);
            const lng = parseFloat(manualCoords.lng);

            const locationDetails = await fetchLocationDetails(lat, lng);
            const newMarker = {
                name: markerName || `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                latitude: lat,
                longitude: lng,
                ...locationDetails,
            };

            const response = await axios.post("http://localhost:5000/markers", newMarker, {
                headers: getAuthHeader(),
            });

            setMarkers((prev) => [...prev, {
                ...newMarker,
                lat,
                lng,
                id: response.data.id.toString(),
                timestamp: new Date().toISOString(),
            }]);
            setManualCoords({ lat: "", lng: "" });
            setMarkerName("");

            if (mapRef.current && mapRef.current.leafletElement) {
                mapRef.current.leafletElement.setView([lat, lng], 13);
            }
        } catch (error) {
            console.error("Error adding marker:", error);
            alert("Failed to add marker. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle map click to add marker
    const handleMapClick = async (e) => {
        setLoading(true);
        try {
            const { lat, lng } = e.latlng;
            const locationDetails = await fetchLocationDetails(lat, lng);
            const newMarker = {
                name: `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                latitude: lat,
                longitude: lng,
                ...locationDetails,
            };

            const response = await axios.post("http://localhost:5000/markers", newMarker, {
                headers: getAuthHeader(),
            });

            setMarkers((prev) => [...prev, {
                ...newMarker,
                lat,
                lng,
                id: response.data.id.toString(),
                timestamp: new Date().toISOString(),
            }]);
        } catch (error) {
            console.error("Error adding marker:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle marker drag end
    const handleMarkerDragEnd = async (e, markerId) => {
        setLoading(true);
        try {
            const { lat, lng } = e.target.getLatLng();
            const locationDetails = await fetchLocationDetails(lat, lng);
            const updatedMarker = {
                latitude: lat,
                longitude: lng,
                ...locationDetails,
            };

            await axios.put(`http://localhost:5000/markers/${markerId}`, updatedMarker, {
                headers: getAuthHeader(),
            });

            setMarkers((prev) => prev.map((m) => (m.id === markerId ? { ...m, lat, lng, ...locationDetails, timestamp: new Date().toISOString() } : m)));
        } catch (error) {
            console.error("Error updating marker:", error);
        } finally {
            setLoading(false);
        }
    };

    // Delete marker
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

    // Clear all markers
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

    // Clear all polylines
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

    // Clear all polygons
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

    // Clear all circles
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

    // Save shapes to backend
    const handleShapeCreated = async (e) => {
        setLoading(true);
        try {
            const { layer, layerType } = e;

            if (layerType === "marker") {
                const { lat, lng } = layer.getLatLng();
                const locationDetails = await fetchLocationDetails(lat, lng);
                const newMarker = {
                    name: `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    latitude: lat,
                    longitude: lng,
                    ...locationDetails,
                };

                const response = await axios.post("http://localhost:5000/markers", newMarker, {
                    headers: getAuthHeader(),
                });

                setMarkers((prev) => [...prev, {
                    ...newMarker,
                    lat,
                    lng,
                    id: response.data.id.toString(),
                    timestamp: new Date().toISOString(),
                }]);
            } else if (layerType === "polyline") {
                const points = layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
                const response = await axios.post("http://localhost:5000/polylines", { points }, {
                    headers: getAuthHeader(),
                });

                setPolylines((prev) => [...prev, {
                    id: response.data.id.toString(),
                    points,
                    timestamp: new Date().toISOString(),
                }]);
            } else if (layerType === "polygon") {
                const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
                const response = await axios.post("http://localhost:5000/polygons", { points }, {
                    headers: getAuthHeader(),
                });

                setPolygons((prev) => [...prev, {
                    id: response.data.id.toString(),
                    points,
                    timestamp: new Date().toISOString(),
                }]);
            } else if (layerType === "circle") {
                const center = [layer.getLatLng().lat, layer.getLatLng().lng];
                const radius = layer.getRadius();
                const response = await axios.post("http://localhost:5000/circles", { center, radius }, {
                    headers: getAuthHeader(),
                });

                setCircles((prev) => [...prev, {
                    id: response.data.id.toString(),
                    center,
                    radius,
                    timestamp: new Date().toISOString(),
                }]);
            }
        } catch (error) {
            console.error("Error saving shape:", error);
        } finally {
            setLoading(false);
        }
    };

    // Go to current location
    const goToCurrentLocation = () => {
        if (currentLocation && mapRef.current && mapRef.current.leafletElement) {
            mapRef.current.leafletElement.setView(currentLocation, 13);
        }
    };

    // Handle location search
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
                {/* Sidebar */}
                <div
                    ref={sidebarRef}
                    style={{
                        width: showSidebar ? "320px" : "40px",
                        padding: showSidebar ? "20px" : "10px 0",
                        borderRight: showSidebar ? "1px solid #e0e0e0" : "none",
                        backgroundColor: "#ffffff",
                        overflowY: showSidebar ? "auto" : "hidden",
                        transition: "width 0.3s ease",
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
                            backgroundColor: "#ddd",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            cursor: "pointer",
                        }}
                    >
                        {showSidebar ? "×" : "☰"}
                    </div>

                    {showSidebar && (
                        <>
                            {loading && (
                                <div style={{ marginBottom: "15px", textAlign: "center" }}>
                                    <span style={{ color: "#666" }}>Loading...</span>
                                </div>
                            )}

                            <div>
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
                                        Add Marker
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Marker Name (optional)"
                                        value={markerName}
                                        onChange={(e) => setMarkerName(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #ddd",
                                            borderRadius: "4px",
                                            marginBottom: "8px",
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
                                                border: "1px solid #ddd",
                                                borderRadius: "4px",
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
                                                border: "1px solid #ddd",
                                                borderRadius: "4px",
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={addManualMarker}
                                        disabled={loading}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#3b82f6",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            opacity: loading ? 0.7 : 1,
                                        }}
                                    >
                                        Add Marker
                                    </button>
                                </div>

                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
                                        Saved Markers
                                    </label>
                                    {markers.length === 0 ? (
                                        <p style={{ color: "#666", fontSize: "14px" }}>No markers saved yet.</p>
                                    ) : (
                                        <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px" }}>
                                            {markers.map((marker) => (
                                                <div
                                                    key={marker.id}
                                                    style={{
                                                        padding: "10px",
                                                        borderBottom: "1px solid #eee",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <div>
                                                        <p style={{ margin: "0 0 3px 0", fontWeight: "bold", fontSize: "14px" }}>
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
                                                            color: "#ff4d4d",
                                                            fontSize: "18px",
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
                                            backgroundColor: "#ff4d4d",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            opacity: loading || markers.length === 0 ? 0.7 : 1,
                                            fontSize: "13px",
                                        }}
                                    >
                                        Clear All Markers
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                                    Use the drawing tools on the map to create shapes. All shapes will be automatically saved.
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                    <div>
                                        <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                                            Polylines ({polylines.length})
                                        </h3>
                                        <button
                                            onClick={clearAllPolylines}
                                            disabled={loading || polylines.length === 0}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#ff4d4d",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                opacity: loading || polylines.length === 0 ? 0.7 : 1,
                                                fontSize: "13px",
                                            }}
                                        >
                                            Clear All Polylines
                                        </button>
                                    </div>

                                    <div>
                                        <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                                            Polygons ({polygons.length})
                                        </h3>
                                        <button
                                            onClick={clearAllPolygons}
                                            disabled={loading || polygons.length === 0}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#ff4d4d",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                opacity: loading || polygons.length === 0 ? 0.7 : 1,
                                                fontSize: "13px",
                                            }}
                                        >
                                            Clear All Polygons
                                        </button>
                                    </div>

                                    <div>
                                        <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                                            Circles ({circles.length})
                                        </h3>
                                        <button
                                            onClick={clearAllCircles}
                                            disabled={loading || circles.length === 0}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#ff4d4d",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                opacity: loading || circles.length === 0 ? 0.7 : 1,
                                                fontSize: "13px",
                                            }}
                                        >
                                            Clear All Circles
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                                    Map data is saved automatically to your MySQL database.
                                </p>
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
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        <LayersControl position="topright">
                            <BaseLayer checked name="OpenStreetMap">
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
                            <BaseLayer name="CartoDB Positron">
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
                                            {marker.name || `Marker ${marker.id}`}
                                        </h3>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                                            {marker.city}, {marker.country}
                                        </p>
                                        <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                                            Lat: {marker.lat.toFixed(6)}, Lng: {marker.lng.toFixed(6)}
                                        </p>
                                        <button
                                            onClick={() => deleteMarker(marker.id)}
                                            style={{
                                                backgroundColor: "#ff4d4d",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "3px",
                                                padding: "5px 10px",
                                                fontSize: "12px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {polylines.map((polyline) => (
                            <Polyline key={polyline.id} positions={polyline.points} color="blue" weight={3} opacity={0.7} />
                        ))}

                        {polygons.map((polygon) => (
                            <Polygon
                                key={polygon.id}
                                positions={polygon.points}
                                color="green"
                                weight={2}
                                opacity={0.5}
                                fillOpacity={0.2}
                            />
                        ))}

                        {circles.map((circle) => (
                            <Circle
                                key={circle.id}
                                center={circle.center}
                                radius={circle.radius}
                                color="red"
                                weight={2}
                                opacity={0.7}
                                fillOpacity={0.2}
                            />
                        ))}

                        <FeatureGroup>
                            <EditControl
                                position="topright"
                                onCreated={handleShapeCreated}
                                draw={{
                                    rectangle: false,
                                    circlemarker: false,
                                    marker: true,
                                    polyline: { shapeOptions: { color: "blue", weight: 3 } },
                                    polygon: { shapeOptions: { color: "green", weight: 2 }, allowIntersection: false },
                                    circle: { shapeOptions: { color: "red", weight: 2 } },
                                }}
                            />
                        </FeatureGroup>
                        <MapControls map={mapRef} />

                        {currentLocation && (
                            <>
                                <Marker
                                    position={currentLocation}
                                    icon={L.divIcon({
                                        html: `<span style="font-size: 24px;"><FaUserAlt /></span>`,
                                        iconSize: [25, 25],
                                        iconAnchor: [12.5, 12.5],
                                    })}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: "10px",
                                        right: "10px",
                                        zIndex: 1000,
                                    }}
                                >
                                    <button
                                        onClick={goToCurrentLocation}
                                        style={{
                                            backgroundColor: "#10b981",
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
                            bottom: "20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "80%",
                            maxWidth: "600px",
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
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
                                fontSize: "16px",
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