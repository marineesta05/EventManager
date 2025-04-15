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

    const [userEmail, setUserEmail] = useState("");
    const [userId, setUserId] = useState(null);
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [addToCalendar, setAddToCalendar] = useState(false);


    useEffect(() => {
        const token = localStorage.getItem("token");
    
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const user_id = decoded.userId || decoded.id || decoded.user_id || decoded.sub;
                setUserId(user_id);
                const userRole = decoded.role;
                if (decoded.email) {
                    setUserEmail(decoded.email);
                }
                setIsAdmin(userRole === 'admin');
                setUserId(user_id);
                setToken(token);
                console.log("User ID:", user_id); 
                console.log("User Role:", userRole);
                
                // Check if user has connected their Google Calendar
                checkCalendarStatus(user_id);
            } catch (error) {
                console.error("Failed to decode token:", error.message);
            }
        } else {
            console.warn("No token found in localStorage.");
        }
    }, []);
    
    const checkCalendarStatus = async (userId) => {
        try {
            const response = await axios.get(`http://localhost:3003/users/${userId}/calendar-status`);
            setCalendarConnected(response.data.connected);
        } catch (error) {
            console.error("Error checking calendar status:", error);
        }
    };
    
    const connectGoogleCalendar = async () => {
        try {
            const response = await axios.get(`http://localhost:3003/auth/google?userId=${userId}`);
            window.location.href = response.data.authUrl;
        } catch (error) {
            console.error("Error connecting to Google Calendar:", error);
            alert("Failed to connect to Google Calendar. Please try again.");
        }
    };

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`http://localhost:3002/events/${id}`);
                setEvent(response.data);  
            } catch (error) {
                console.error("Error fetching event details:", error);
            } finally {
                setLoading(false);
            }
        };
    
        const fetchReservedSeats = async () => {
            try {
                const res = await axios.get(`http://localhost:3003/events/${id}/seats`);
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
            
            
            let email = userEmail;
            if (!email && decoded.email) {
                email = decoded.email;
            }
            
            const reservationResponse = await axios.post("http://localhost:3003/reserve", {
                user_id,
                event_id: parseInt(id),
                seat_numbers: selectedSeats,
                email: email,
                add_to_calendar: addToCalendar
            });
    
            setReservedSeats([...reservedSeats, ...selectedSeats]);
            setSelectedSeats([]);
            
            let message = "Réservation réussie ! Un email de confirmation a été envoyé.";
            if (addToCalendar && calendarConnected) {
                message += " L'événement a été ajouté à votre Google Calendar.";
            }
            
            alert(message);
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
                    Authorization: `Bearer ${token}`,
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
        window.location.href = `/updateEvent/${id}`;
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not authenticated");
            
            if (window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
                await axios.delete(`http://localhost:3002/events/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
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
                        marginBottom: "15px"
                    }} 
                />
                <h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>{event.title}</h1>
                <div className="event-info" style={{ textAlign: "center" }}>
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
                    <h3 style={{ margin: "0 0 15px 0", width: "100%", textAlign: "center" }}>Administration</h3>
                    <button 
                        onClick={handleUpdate}
                        style={{ 
                            backgroundColor: "#007bff", 
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
                            backgroundColor: "#dc3545", 
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
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
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
                    
                 
                    <div style={{
                        marginBottom: "20px",
                        backgroundColor: "#f8f9fa",
                        padding: "15px",
                        borderRadius: "8px",
                        textAlign: "left"
                    }}>
                        <div style={{ marginBottom: "15px" }}>
                            <h4 style={{ marginBottom: "10px" }}>Options supplémentaires</h4>
                            <div style={{ 
                                display: "flex", 
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                <input 
                                    type="checkbox" 
                                    id="addToCalendar" 
                                    checked={addToCalendar}
                                    onChange={(e) => setAddToCalendar(e.target.checked)}
                                    disabled={!calendarConnected}
                                    style={{ cursor: calendarConnected ? "pointer" : "not-allowed" }}
                                />
                                <label htmlFor="addToCalendar">
                                    Ajouter à mon Google Calendar
                                </label>
                            </div>
                        </div>
                        
                        {!calendarConnected && (
                            <div style={{ marginTop: "10px" }}>
                                <button 
                                    onClick={connectGoogleCalendar}
                                    style={{ 
                                        backgroundColor: "#4285F4", 
                                        color: "white", 
                                        border: "none", 
                                        padding: "8px 15px", 
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontSize: "14px"
                                    }}
                                >
                                    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                                        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                                        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                                        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                                        <path fill="none" d="M2 2h44v44H2z"/>
                                    </svg>
                                    Connecter Google Calendar
                                </button>
                                <p style={{ 
                                    fontSize: "13px", 
                                    color: "#666",
                                    marginTop: "8px"
                                }}>
                                    Connectez votre compte Google Calendar pour ajouter automatiquement les événements réservés à votre agenda.
                                </p>
                            </div>
                        )}
                        
                        {calendarConnected && (
                            <p style={{ 
                                fontSize: "13px", 
                                color: "#28a745", 
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                </svg>
                                Google Calendar connecté
                            </p>
                        )}
                    </div>
                    
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
                        Réserver {selectedSeats.length > 0 ? `(${selectedSeats.length} place${selectedSeats.length > 1 ? 's' : ''})` : ''}
                    </button>
                </div>
            </div>
        
        </div>
    );
};

export default EventId;