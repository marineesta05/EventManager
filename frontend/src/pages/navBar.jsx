import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Navbar = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsLoggedIn(true);
            try {
                const decoded = jwtDecode(token);
                const userRole = decoded.role;
                setIsAdmin(userRole === 'admin');
            } catch (error) {
                console.error("Failed to decode token:", error.message);
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setIsAdmin(false);
        navigate("/login");
    };

    return (
        <nav>
            
            <div className="nav-links" style={{ display: "flex", gap: "20px" }}>
                <Link to="/home" style={{ color: "white", textDecoration: "none" }}>
                    Home
                </Link>
                {isLoggedIn ? (
                    <>
                        <Link to="/dashboard" style={{ color: "white", textDecoration: "none" }}>
                            Dashboard
                        </Link>
                        {isAdmin && (
                            <Link to="/users" style={{ color: "white", textDecoration: "none" }}>
                                Users
                            </Link>
                        )}
                        <button className="nav-logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ color: "white", textDecoration: "none" }}>
                            Connexion
                        </Link>
                        
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;