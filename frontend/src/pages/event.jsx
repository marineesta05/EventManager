import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const EventId = () => {
    const { id } = useParams(); 
    const [event, setEvent] = useState();
    const [selectedSeats, setSelectedSeats] = useState([]);
    
    useEffect(() => {
        fetchEvent();
    }, []);

    const fetchEvent = async () => {
        try {
            const response = await axios.get(`http://localhost:3002/events/${id}`);
            setEvent(response.data);  
        } catch (error) {
            console.error("Error fetching event details:", error);
        }
    };

    const handleSeatClick = (seatNumber) => {
        if (selectedSeats.includes(seatNumber)) {
            setSelectedSeats(selectedSeats.filter((seat) => seat !== seatNumber));
        } else {
            setSelectedSeats([...selectedSeats, seatNumber]);
        }
    };

    if (!event) {
        return <div>Chargement en cours...</div>;
    }

    return (
        <div>
            <img src={event.image} alt={event.title} style={{ width: "100px", height: "100px" }} />
            <p>{event.title}</p>
            <p>Date: {event.datetime}</p>
            <p>Location: {event.location}</p>
            <h2>Available Seats</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
                {Array.from({ length: event.capacity }, (_, index) => {
                    const seatNumber = index + 1;
                    return (
                        <button
                            key={seatNumber}
                            onClick={() => handleSeatClick(seatNumber)}
                            style={{
                                padding: "10px",
                                backgroundColor: selectedSeats.includes(seatNumber) ? "green" : "lightgray",
                                border: "1px solid black",
                                cursor: "pointer",
                            }}
                        >
                            {seatNumber}
                        </button>
                    );
                })}
            </div>
            <h3>Selected Seats: {selectedSeats.join(", ") || "None"}</h3>
            
        </div>
    );
};


export default EventId;