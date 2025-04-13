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
        <nav style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "15px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
        }}>
        
            
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
                        <button 
                            onClick={handleLogout}
                            style={{
                                background: "transparent",
                                border: "1px solid white",
                                color: "white",
                                padding: "5px 10px",
                                borderRadius: "5px",
                                cursor: "pointer"
                            }}
                        >
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