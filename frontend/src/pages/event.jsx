import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const EventId = () => {
    const { id } = useParams(); 
    const [event, setEvent] = useState();
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [reservedSeats, setReservedSeats] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [waitingMessage, setWaitingMessage] = useState("");


    useEffect(() => {
        const token = localStorage.getItem("token");
    
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const user_id = decoded.userId || decoded.id || decoded.user_id || decoded.sub;
                const userRole = decoded.role;
                
                setIsAdmin(userRole === 'admin');
                setUserId(user_id);
                setToken(token);
                console.log("User ID:", user_id); 
                console.log("User Role:", userRole);
            } catch (error) {
                console.error("Failed to decode token:", error.message);
            }
        } else {
            console.warn("No token found in localStorage.");
        }
    }, []);
    

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setLoading(true);
                const response = await axios.get(http://localhost:3002/events/${id});
                setEvent(response.data);  
            } catch (error) {
                console.error("Error fetching event details:", error);
            } finally {
                setLoading(false);
            }
        };
    
        const fetchReservedSeats = async () => {
            try {
                const res = await axios.get(http://localhost:3003/events/${id}/seats);
                const takenSeats = res.data.filter(seat => seat.is_reserved).map(seat => seat.seat_number);
                setReservedSeats(takenSeats);
            } catch (error) {
                console.error("Error fetching reserved seats:", error);
            }
        };
    
        fetchEvent();
        fetchReservedSeats();
    
        const socket = io("http://localhost:3003");
        socket.on("seat_reserved", ({ eventId, seatIds }) => {
            if (eventId === id) {
                fetchReservedSeats();
            }
        });
    
        return () => socket.disconnect();
    }, [id]);
    
    const handleSeatClick = (seatNumber) => {
        if (selectedSeats.includes(seatNumber)) {
            setSelectedSeats(selectedSeats.filter((seat) => seat !== seatNumber));
        } else {
            setSelectedSeats([...selectedSeats, seatNumber]);
        }
    };

    const handleReserve = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not authenticated");
    
            const decoded = jwtDecode(token);
            const user_id = decoded.userId || decoded.id || decoded.user_id || decoded.sub;
            
            await axios.post("http://localhost:3003/reserve", {
                user_id,
                event_id: parseInt(id),
                seat_numbers: selectedSeats
            });
    
            setReservedSeats([...reservedSeats, ...selectedSeats]);
            
            setSelectedSeats([]);
            
            alert("Réservation réussie !");
            window.location.href = '/home';
        } catch (error) {
            console.error("Reservation failed:", error.response?.data || error.message);
            alert(error.response?.data?.error || "Reservation error");
        }
    };

    const handleJoinWaitingList = async () => {
        try {
            const response = await axios.post("http://localhost:3003/reserve", {
                user_id: userId,
                event_id: parseInt(id),
                seat_numbers: []
            }, {
                headers: {
                    Authorization: Bearer ${token},
                    "Content-Type": "application/json"
                }
            });

            setWaitingMessage(response.data.message || "Ajouté à la liste d'attente !");
            alert(response.data.message || "Ajouté à la liste d'attente !");
        } catch (error) {
            console.error("Erreur liste d’attente :", error.response?.data || error.message);
            setWaitingMessage(error.response?.data?.error || "Erreur lors de l’inscription.");
            alert(error.response?.data?.error || "Erreur lors de l’inscription.");
        }
    };
    
    const handleUpdate = () => {
        window.location.href = /updateEvent/${id};
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not authenticated");
            
            if (window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
                await axios.delete(http://localhost:3002/events/${id}, {
                    headers: {
                        Authorization: Bearer ${token}
                    }
                });
                
                window.location.href = '/home';
            }
        } catch (error) {
            console.error("Delete failed:", error.response?.data || error.message);
            alert(error.response?.data?.error || "Delete error");
        }
    };

    if (loading) {
        return (
            <div className="loading-container" style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                fontSize: "1.5rem"
            }}>
                <div>Chargement en cours...</div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="error-container" style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                color: "red",
                fontSize: "1.5rem"
            }}>
                <div>Erreur: Impossible de charger l'événement</div>
            </div>
        );
    }

    const calculateColumns = (capacity) => {
        if (capacity <= 20) return 5;
        if (capacity <= 50) return 10;
        if (capacity <= 100) return 15;
        return 20; 
    };

    const columns = calculateColumns(event.capacity);

    return (
        <div className="event-detail-container" style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "20px",
            fontFamily: "Arial, sans-serif"
        }}>
            <div className="event-header" style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "30px",
                backgroundColor: "#f8f9fa",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
            }}>
                <img 
                    src={event.image} 
                    alt={event.title} 
                    style={{ 
                        width: "200px", 
                        height: "200px", 
                        objectFit: "cover",
                        borderRadius: "8px",
                        marginBottom: "15px",
                        border: "none",
                    }} 
                />
                <h1 style={{ fontSize: "2rem", marginBottom: "10px", color: "gray" }}>{event.title}</h1>
                <div className="event-info" style={{ textAlign: "center", color: "gray" }}>
                    <p style={{ fontSize: "1.2rem", marginBottom: "5px" }}>
                        <strong>Date:</strong> {new Date(event.datetime).toLocaleString()}
                    </p>
                    <p style={{ fontSize: "1.2rem", marginBottom: "5px" }}>
                        <strong>Lieu:</strong> {event.location}
                    </p>
                    <p style={{ fontSize: "1.2rem" }}>
                        <strong>Capacité:</strong> {event.capacity} places
                    </p>
                </div>
            </div>
            
            {isAdmin && (
                <div className="admin-controls" style={{ 
                    margin: "15px 0", 
                    padding: "15px", 
                    backgroundColor: "#f8f9fa", 
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    display: "flex",
                    justifyContent: "center",
                    gap: "15px"
                }}>
                    <h3 style={{ margin: "0 0 15px 0", width: "100%", textAlign: "center", color: "gray" }}>Administration</h3>
                    <button 
                        onClick={handleUpdate}
                        style={{ 
                            backgroundColor: "gray", 
                            color: "white", 
                            border: "none", 
                            padding: "10px 20px", 
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Modifier l'événement
                    </button>
                    <button 
                        onClick={handleDelete}
                        style={{ 
                            backgroundColor: "#c82333", 
                            color: "white", 
                            border: "none", 
                            padding: "10px 20px", 
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Supprimer l'événement
                    </button>
                </div>
            )}
            
            <div className="seating-section" style={{
                marginTop: "30px",
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
            }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Plan des places</h2>
                
                <div className="screen" style={{
                    width: "80%",
                    height: "30px",
                    backgroundColor: "#ddd",
                    margin: "0 auto 30px auto",
                    borderRadius: "5px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "14px",
                    color: "#555"
                }}>SCÈNE</div>

                {reservedSeats.length === event.capacity && (
                                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                                        <p style={{ marginBottom: "10px", color: "#6c757d" }}>
                                            Toutes les places sont réservées.
                                        </p>
                                        <button 
                                            onClick={handleJoinWaitingList}
                                            style={{
                                                backgroundColor: "#dc3545",
                                                color: "#333",
                                                border: "none",
                                                padding: "12px 20px",
                                                borderRadius: "5px",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                fontSize: "16px"
                                            }}
                                        >
                                            S’inscrire sur la liste d’attente
                                        </button>
                                        {waitingMessage && (
                                            <p style={{ color: "#28a745", marginTop: "10px" }}>{waitingMessage}</p>
                                        )}
                                    </div>
                                )}
                
                <div className="seats-container" style={{
                    display: "grid",
                    gridTemplateColumns: repeat(${columns}, 1fr),
                    gap: "6px",
                    justifyContent: "center",
                    maxWidth: "100%",
                    overflowX: "auto"
                }}>
                    {Array.from({ length: event.capacity }, (_, index) => {
                        const seatNumber = index + 1;
                        const isReserved = reservedSeats.includes(seatNumber);
                        const isSelected = selectedSeats.includes(seatNumber);
                        
                        return (
                            <button
                                key={seatNumber}
                                onClick={() => handleSeatClick(seatNumber)}
                                disabled={isReserved}
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    padding: "0",
                                    fontSize: "12px",
                                    backgroundColor: isReserved ? "#dc3545" : isSelected ? "#28a745" : "#f8f9fa",
                                    color: (isReserved || isSelected) ? "white" : "#333",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    cursor: isReserved ? "not-allowed" : "pointer",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    opacity: isReserved ? "0.8" : "1"
                                }}
                            >
                                {seatNumber}
                            </button>
                        );
                    })}
                </div>
                
                <div className="seat-legend" style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginTop: "20px",
                    fontSize: "14px"
                }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ 
                            width: "20px", 
                            height: "20px", 
                            backgroundColor: "#f8f9fa", 
                            border: "1px solid #ccc",
                            marginRight: "5px",
                            borderRadius: "3px"
                        }}></div>
                        <span>Disponible</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ 
                            width: "20px", 
                            height: "20px", 
                            backgroundColor: "#28a745", 
                            border: "1px solid #28a745",
                            marginRight: "5px",
                            borderRadius: "3px"
                        }}></div>
                        <span>Sélectionné</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ 
                            width: "20px", 
                            height: "20px", 
                            backgroundColor: "#dc3545", 
                            border: "1px solid #dc3545",
                            marginRight: "5px",
                            borderRadius: "3px"
                        }}></div>
                        <span>Réservé</span>
                    </div>
                </div>
                
                <div className="reservation-info" style={{
                    marginTop: "25px",
                    textAlign: "center"
                }}>
                    <h3 style={{ marginBottom: "15px" }}>
                        Places sélectionnées: 
                        <span style={{ fontWeight: "normal", marginLeft: "10px" }}>
                            {selectedSeats.length > 0 ? selectedSeats.join(", ") : "Aucune"}
                        </span>
                    </h3>
                    
                    <button 
                        onClick={handleReserve} 
                        disabled={selectedSeats.length === 0}
                        style={{ 
                            backgroundColor: selectedSeats.length === 0 ? "#6c757d" : "#28a745", 
                            color: "white", 
                            border: "none", 
                            padding: "12px 25px", 
                            borderRadius: "5px",
                            cursor: selectedSeats.length === 0 ? "not-allowed" : "pointer",
                            fontSize: "16px",
                            fontWeight: "bold",
                            marginTop: "10px"
                        }}
                    >
                        Réserver {selectedSeats.length > 0 ? (${selectedSeats.length} place${selectedSeats.length > 1 ? 's' : ''}) : ''}
                        
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventId;