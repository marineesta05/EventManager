import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:3002");

const Home = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const token = localStorage.getItem("token");

    useEffect(() => {
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

        
    }, []);

    const handleEdit = (eventId) => {
        navigate(`/updateEvent/${eventId}`);
    };

    const handleDelete = async (eventId) =>{
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
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowNotif(!showNotif)} style={{ fontSize: "24px", background: "none", border: "none", cursor: "pointer" }}>
                        🔔
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                backgroundColor: 'red',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 6px',
                                fontSize: '12px'
                            }}>
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {showNotif && (
                        <div style={{
                            position: 'absolute',
                            top: '35px',
                            right: '0',
                            backgroundColor: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            width: '250px',
                            zIndex: 999,
                            padding: '10px'
                        }}>
                            <strong>Notifications</strong>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
                                {notifications.map((notif, index) => (
                                    <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                        {notif.message}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => setNotifications([])} style={{ marginTop: "10px", fontSize: "12px" }}>Vider</button>
                        </div>
                    )}
                </div>
            </div>


            <button onClick={() => navigate('/createEvent')}>Create New Event</button>
            <ul>
                {events.map(event => (
                    <li key={event.id}>
                        <img src={event.image} alt={event.title} style={{ width: "100px", height: "100px" }} />
                        <h2>{event.title}</h2>
                        <p>Date: {event.datetime}</p>
                        <p>Location: {event.location}</p>
                        <p>Capacity: {event.capacity}</p>
                        <button onClick={() => navigate(`/event/${event.id}`)}>Reserver</button>
                        <button onClick={() => handleEdit(event.id)}>Modifier</button>
                        <button onClick={() => handleDelete(event.id)}>Supprimer</button>
                    </li>
                ))}
            </ul>

        </div>
    );
};

            
export default Home;