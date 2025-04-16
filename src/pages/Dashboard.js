import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapComponent from "../components/MapComponent";
import "../index.css";

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            navigate("/login");
        }
        setLoading(false);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        navigate("/");
    };

    if (loading) {
        return <h2>Loading...</h2>;
    }

    return (
        <div className="dashboard-container">
            <MapComponent />
            <div className="floating-tools">
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Dashboard;