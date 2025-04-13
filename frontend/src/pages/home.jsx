import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const socket = io("http://localhost:3002");

const Home = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const token = localStorage.getItem("token");

    useEffect(() => {
        
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const userRole = decoded.role;
                setIsAdmin(userRole === 'admin');
                console.log("User Role:", userRole);
                console.log("Is Admin:", userRole === 'admin');
            } catch (error) {
                console.error("Failed to decode token:", error.message);
            }
        }

        axios.get("http://localhost:3002/events")
            .then(response => {
                setEvents(response.data);
            })
            .catch(error => {
                console.error("Error fetching events:", error);
            });

        socket.on("eventAdded", (newEvent) => {
            setEvents(prev => [...prev, newEvent]);
            setNotifications(prev => [
                ...prev,
                { type: "add", message: `Nouvel événement ajouté : ${newEvent.title}` }
            ]);
        });

        socket.on("eventUpdated", (updatedEvent) => {
            console.log("Event Updated:", updatedEvent);
            setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
            setNotifications(prev => [
                ...prev,
                { type: "update", message: `Événement modifié : ${updatedEvent.title}` }
            ]);
        });

        socket.on("eventDeleted", ({ id }) => {
            setEvents(prev => prev.filter(ev => ev.id !== id));
            setNotifications(prev => [
                ...prev,
                { type: "delete", message: `Un événement a été supprimé.` }
            ]);
        });

        return () => {
            socket.off("eventAdded");
            socket.off("eventUpdated");
            socket.off("eventDeleted");
        };
    }, [token]);

    const handleEdit = (eventId) => {
        navigate(`/updateEvent/${eventId}`);
    };

    const handleDelete = async (eventId) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
            try {
                const response = await axios.delete(`http://localhost:3002/events/${eventId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.status === 200) {
                    setEvents(events.filter(event => event.id !== eventId)); 
                    alert("Événement supprimé avec succès !");
                }
            } catch (error) {
                console.error("Error deleting event:", error);
                alert("Erreur lors de la suppression de l'événement.");
            }
        }
    };

    return (
        <div>
            <div>
                <h1>Home Page</h1>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        onClick={() => setShowNotif(!showNotif)}
                        style={{
                        fontSize: "28px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        }}
                    >
                        🔔
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                backgroundColor: 'red',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                lineHeight: '1',
                                minWidth: '20px',
                                textAlign: 'center',
                                zIndex: 2
                            }}>
                                {notifications.length}
                            </span>
                        )}
                    </button>
                    {showNotif && (
                        <div style={{
                            position: 'fixed',
                            top: '60px', 
                            right: '20px',
                            backgroundColor: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            width: '280px',
                            zIndex: 9999,
                            padding: '10px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            <strong style={{ display: "block", marginBottom: "10px" }}>Notifications</strong>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {notifications.map((notif, index) => (
                                    <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                        {notif.message}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => setNotifications([])}
                                style={{
                                    marginTop: "10px",
                                    fontSize: "12px",
                                    padding: "5px 10px",
                                    border: "none",
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Vider
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {isAdmin && (
                <button 
                    onClick={() => navigate('/createEvent')}
                    style={{
                        backgroundColor: "#007bff",
                        color: "white",
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: "4px",
                        marginBottom: "20px",
                        cursor: "pointer"
                    }}
                >
                    Create New Event
                </button>
            )}

            <ul style={{ 
                listStyle: 'none', 
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {events.map(event => (
                    <li key={event.id} style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <img src={event.image} alt={event.title} style={{ 
                            width: "100%", 
                            height: "200px", 
                            objectFit: "cover",
                            borderRadius: "6px"
                        }} />
                        <h2>{event.title}</h2>
                        <p>Date: {event.datetime}</p>
                        <p>Location: {event.location}</p>
                        <p>Capacity: {event.capacity}</p>
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button 
                                onClick={() => navigate(`/event/${event.id}`)}
                                style={{
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    padding: "8px 16px",
                                    border: "none",
                                    borderRadius: "4px",
                                    flex: "1",
                                    cursor: "pointer"
                                }}
                            >
                                Réserver
                            </button>
                            
                            {isAdmin && (
                                <>
                                    <button 
                                        onClick={() => handleEdit(event.id)}
                                        style={{
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            padding: "8px 16px",
                                            border: "none",
                                            borderRadius: "4px",
                                            flex: "1",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Modifier
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(event.id)}
                                        style={{
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            padding: "8px 16px",
                                            border: "none",
                                            borderRadius: "4px",
                                            flex: "1",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Supprimer
                                    </button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
            
export default Home;