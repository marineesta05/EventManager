import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const Dashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    
    useEffect(() => {
        const fetchTickets = async () => {
            const token = localStorage.getItem("token");
            
            if (!token) {
                navigate("/login");
                return;
            }
            
            try {
                setLoading(true);
                const response = await axios.get("http://localhost:3004/my-tickets", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                setTickets(response.data);
                setError(null);
            } catch (error) {
                console.error("Error fetching tickets:", error);
                setError("Impossible de récupérer vos réservations");
            } finally {
                setLoading(false);
            }
        };
        
        fetchTickets();
    }, [navigate]);

    const ticketsByEvent = tickets.reduce((acc, ticket) => {
        const eventId = ticket.event_id;
        if (!acc[eventId]) {
            acc[eventId] = {
                id: eventId,
                title: ticket.event_title,
                datetime: ticket.datetime,
                location: ticket.location,
                image: ticket.image,
                seats: []
            };
        }
        acc[eventId].seats.push(ticket.seat_number);
        return acc;
    }, {});
    
    if (loading) {
        return <div style={{ textAlign: "center", padding: "50px" }}>Chargement...</div>;
    }
    
    if (error) {
        return <div style={{ textAlign: "center", padding: "50px", color: "red" }}>{error}</div>;
    }
    
    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
            <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Mes réservations</h1>
            
            {Object.keys(ticketsByEvent).length === 0 ? (
                <div style={{ 
                    textAlign: "center", 
                    padding: "50px", 
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    marginTop: "20px"
                }}>
                    <p>Vous n'avez pas encore de réservations.</p>
                    <button 
                        onClick={() => navigate("/")}
                        style={{
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "5px",
                            marginTop: "20px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Voir les événements disponibles
                    </button>
                </div>
            ) : (
                <div className="tickets-container">
                    {Object.values(ticketsByEvent).map(event => (
                        <div 
                            key={event.id} 
                            className="ticket-item"
                            style={{
                                marginBottom: "30px",
                                padding: "20px",
                                backgroundColor: "#fff",
                                borderRadius: "10px",
                                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                display: "flex",
                                flexDirection: "row",
                                gap: "20px"
                            }}
                        >
                            <div className="ticket-image" style={{ flex: "0 0 150px" }}>
                                <img 
                                    src={event.image} 
                                    alt={event.title}
                                    style={{
                                        width: "150px",
                                        height: "150px",
                                        objectFit: "cover",
                                        borderRadius: "8px"
                                    }}
                                />
                            </div>
                            
                            <div className="ticket-details" style={{ flex: "1" }}>
                                <h2 style={{ marginBottom: "10px" }}>{event.title}</h2>
                                <p style={{ marginBottom: "5px" }}>
                                    <strong>Date:</strong> {new Date(event.datetime).toLocaleString()}
                                </p>
                                <p style={{ marginBottom: "5px" }}>
                                    <strong>Lieu:</strong> {event.location}
                                </p>
                                <p style={{ marginBottom: "15px" }}>
                                    <strong>Places réservées:</strong> {event.seats.sort((a, b) => a - b).join(", ")}
                                </p>
                                
                                <button 
                                    onClick={() => navigate(`/event/${event.id}`)}
                                    style={{
                                        backgroundColor: "#007bff",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 15px",
                                        borderRadius: "5px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Voir l'événement
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;