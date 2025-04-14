import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/login");
                return;
            }

            const decoded = jwtDecode(token);
            if (decoded.role !== "admin") {
                navigate("/home"); 
                return;
            }

            try {
                setLoading(true);
                const response = await axios.get("http://localhost:3004/admin/users", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                setUsers(response.data); 
            } catch (err) {
                console.error("Erreur lors du chargement des utilisateurs", err);
                setError("Impossible de récupérer les utilisateurs");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [navigate]);

    if (loading) return <div style={{ textAlign: "center", padding: "50px", color: "gray" }}>Chargement...</div>;
    if (error) return <div style={{ color: "red", textAlign: "center" }}>{error}</div>;

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
            <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Utilisateurs & Réservations</h1>

            {users.map(user => (
                <div key={user.id} style={{
                    marginBottom: "30px",
                    color: "gray",
                    padding: "20px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "10px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
                }}>
                    <h2>{user.email}</h2>

                    {user.reservations?.length > 0 ? (
                        <ul style={{ marginTop: "10px" }}>
                            {user.reservations.map((res, i) => (
                                <li key={i} style={{ marginBottom: "5px" }}>
                                    <strong>Événement :</strong> {res.event_title} | 
                                    <strong> Date :</strong> {new Date(res.datetime).toLocaleString()} | 
                                    <strong> Place :</strong> {res.seat_number}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ fontStyle: "italic", color: "gray" }}>Aucune réservation</p>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Users;
