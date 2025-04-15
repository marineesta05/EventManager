import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import socket from "../socket"; 

const Home = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const token = localStorage.getItem("token");
    const socketInitialized = useRef(false);
    
    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setIsAdmin(decoded.role === 'admin');
            } catch (error) {
                console.error("Failed to decode token:", error.message);
            }
        }
    }, [token]);
    
    useEffect(() => {
        fetchEvents();
    }, []);
    
    useEffect(() => {
        const storedNotifications = localStorage.getItem('eventNotifications');
        if (storedNotifications) {
            try {
                setNotifications(JSON.parse(storedNotifications));
            } catch (e) {
                console.error("Error parsing stored notifications:", e);
                localStorage.removeItem('eventNotifications');
            }
        }
    }, []);
    
    useEffect(() => {
        if (socketInitialized.current) return;
        
        console.log("Setting up socket event listeners");
        socketInitialized.current = true;

        function handleEventAdded(newEvent) {
            console.log("Event added received:", newEvent);
            setEvents(prevEvents => {
                // Éviter les doublons
                if (prevEvents.some(e => e.id === newEvent.id)) {
                    return prevEvents;
                }
                return [...prevEvents, newEvent];
            });
            const newNotification = {
                type: "add",
                id: Date.now(),
                message: `Nouvel événement ajouté : ${newEvent.title}`,
                timestamp: new Date().toLocaleTimeString()
            };
            setNotifications(prev => [newNotification, ...prev]);
            const storedNotifications = localStorage.getItem('eventNotifications');
            let updatedNotifications = [newNotification];
            
            if (storedNotifications) {
                try {
                    const parsedNotifications = JSON.parse(storedNotifications);
                    if (Array.isArray(parsedNotifications) && parsedNotifications.length > 0) {
                        updatedNotifications = [newNotification, ...parsedNotifications];
                    }
                } catch (e) {
                    console.error("Error parsing stored notifications:", e);
                }
            }
            
            localStorage.setItem('eventNotifications', JSON.stringify(updatedNotifications));
        }
        
        function handleEventUpdated(updatedEvent) {
            console.log("Event updated received:", updatedEvent);
            setEvents(prevEvents => 
                prevEvents.map(event => 
                    event.id === updatedEvent.id ? updatedEvent : event
                )
            );
            const newNotification = {
                type: "update",
                id: Date.now(),
                message: `Événement modifié : ${updatedEvent.title}`,
                timestamp: new Date().toLocaleTimeString()
            };
            setNotifications(prev => [newNotification, ...prev]);
            const storedNotifications = localStorage.getItem('eventNotifications');
            let updatedNotifications = [newNotification];
            
            if (storedNotifications) {
                try {
                    const parsedNotifications = JSON.parse(storedNotifications);
                    if (Array.isArray(parsedNotifications) && parsedNotifications.length > 0) {
                        updatedNotifications = [newNotification, ...parsedNotifications];
                    }
                } catch (e) {
                    console.error("Error parsing stored notifications:", e);
                }
            }
            
            localStorage.setItem('eventNotifications', JSON.stringify(updatedNotifications));
        }
        
        function handleEventDeleted(data) {
            console.log("Event deleted received:", data);
            const eventId = typeof data.id === 'string' ? parseInt(data.id) : data.id;
            
            setEvents(prevEvents => 
                prevEvents.filter(event => event.id !== eventId)
            );
            const eventTitle = data.title === undefined || data.title === null ? 'Inconnu' : data.title;
            const newNotification = {
                type: "delete",
                id: Date.now(),
                message: `Événement supprimé : ${eventTitle}`,
                timestamp: new Date().toLocaleTimeString()
            };
            setNotifications(prev => [newNotification, ...prev]);
            const storedNotifications = localStorage.getItem('eventNotifications');
            let updatedNotifications = [newNotification];
            
            if (storedNotifications) {
                try {
                    const parsedNotifications = JSON.parse(storedNotifications);
                    if (Array.isArray(parsedNotifications) && parsedNotifications.length > 0) {
                        updatedNotifications = [newNotification, ...parsedNotifications];
                    }
                } catch (e) {
                    console.error("Error parsing stored notifications:", e);
                }
            }
            
            localStorage.setItem('eventNotifications', JSON.stringify(updatedNotifications));
        }
        socket.on("eventAdded", handleEventAdded);
        socket.on("eventUpdated", handleEventUpdated);
        socket.on("eventDeleted", handleEventDeleted);
        return () => {
            console.log("Cleaning up socket listeners");
            socket.off("eventAdded", handleEventAdded);
            socket.off("eventUpdated", handleEventUpdated);
            socket.off("eventDeleted", handleEventDeleted);
            socketInitialized.current = false;
        };
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await axios.get("http://localhost:3002/events");
            setEvents(response.data);
        } catch (error) {
            console.error("Error fetching events:", error);
        }
    };

    const handleEdit = (eventId) => {
        navigate(`/updateEvent/${eventId}`);
    };

    const handleDelete = async (eventId) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
            try {
                await axios.delete(`http://localhost:3002/events/${eventId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Error deleting event:", error);
                alert("Erreur lors de la suppression de l'événement.");
            }
        }
    };

    const clearNotifications = () => {
        setNotifications([]);
        localStorage.removeItem('eventNotifications');
        setShowNotif(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Home Page</h1>
                <div style={{ position: 'relative' }}>
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
                            position: 'absolute',
                            top: '40px', 
                            right: '0',
                            backgroundColor: 'gray',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            width: '280px',
                            zIndex: 9999,
                            padding: '10px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <strong>Notifications</strong>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearNotifications}
                                        style={{
                                            fontSize: "12px",
                                            padding: "5px 10px",
                                            border: "none",
                                            backgroundColor: "#c82333",
                                            color: "white",
                                            borderRadius: "4px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Vider
                                    </button>
                                )}
                            </div>
                            
                            {notifications.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {notifications.map((notif) => (
                                        <li key={notif.id} style={{ 
                                            marginBottom: '8px', 
                                            fontSize: '14px',
                                            backgroundColor: notif.type === 'add' ? '#d4edda' : 
                                                           notif.type === 'update' ? '#d1ecf1' : '#f8d7da',
                                            padding: '8px',
                                            borderRadius: '4px'
                                        }}>
                                            <div>{notif.message}</div>
                                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                {notif.timestamp}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#999' }}>
                                    Aucune notification
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isAdmin && (
                <button 
                    onClick={() => navigate('/createEvent')}
                    style={{
                        backgroundColor: "#5e35b1",
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
                {events.length > 0 ? (
                    events.map(event => (
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
                            <p>Date: {new Date(event.datetime).toLocaleString()}</p>
                            <p>Location: {event.location}</p>
                            <p>Capacity: {event.capacity}</p>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button 
                                    onClick={() => navigate(`/event/${event.id}`)}
                                    style={{
                                        backgroundColor: "gray",
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
                                                backgroundColor: "gray",
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
                                                backgroundColor: "#c82333",
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
                    ))
                ) : (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                        Aucun événement disponible
                    </p>
                )}
            </ul>
        </div>
    );
};
            
export default Home;