import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:3002");

const Home = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
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
        });

        socket.on("eventUpdated", (updatedEvent) => {
            setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
        });

        socket.on("eventDeleted", ({ id }) => {
            setEvents(prev => prev.filter(ev => ev.id !== id));
        });

        
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
                <h1>Home Page</h1>
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