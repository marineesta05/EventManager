import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";


const Home = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);

    useEffect(() => {
        axios.get("http://localhost:3002/events")
            .then(response => {
                setEvents(response.data);
            })
            .catch(error => {
                console.error("Error fetching events:", error);
            });
    }, []);
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
                    </li>
                    
                ))}
                </ul>

            </div>
                );
            };

            
export default Home;