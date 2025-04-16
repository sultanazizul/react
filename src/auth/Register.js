import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await axios.post("http://localhost:5000/auth/register", { email, password });
            navigate("/login");
        } catch (error) {
            setError(error.response?.data?.message || "Registration failed");
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <h2>Welcome</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleRegister}>
                <div className="input-container">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <label>Email</label>
                </div>

                <div className="input-container">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <label>Password</label>
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>

            <p className="nav-text">
                Sudah punya akun? <span onClick={() => navigate("/login")}>Login</span>
            </p>
        </div>
    );
};

export default Register;