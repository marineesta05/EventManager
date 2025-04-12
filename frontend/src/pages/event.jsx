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

    useEffect(() => {
        const token = localStorage.getItem("token");
    
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const user_id = decoded.userId || decoded.id || decoded.user_id || decoded.sub;

                console.log("User ID:", user_id); 
                console.log("Decoded token:", decoded);
                console.log("User ID:", decoded.id); 
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
                const response = await axios.get(`http://localhost:3002/events/${id}`);
                setEvent(response.data);  
            } catch (error) {
                console.error("Error fetching event details:", error);
            }
        };
    
        const fetchReservedSeats = async () => {
            const res = await axios.get(`http://localhost:3003/events/${id}/seats`);
            const takenSeats = res.data.filter(seat => seat.is_reserved).map(seat => seat.seat_number);
            setReservedSeats(takenSeats);
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
    
            setSelectedSeats([]);
        } catch (error) {
            console.error("Reservation failed:", error.response?.data || error.message);
            alert(error.response?.data?.error || "Reservation error");
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
                            disabled={reservedSeats.includes(seatNumber)}
                            style={{
                                padding: "10px",
                                backgroundColor: reservedSeats.includes(seatNumber)
                                    ? "red"
                                    : selectedSeats.includes(seatNumber)
                                    ? "green"
                                    : "lightgray",
                                border: "1px solid black",
                                cursor: reservedSeats.includes(seatNumber) ? "not-allowed" : "pointer",
                            }}
                        >
                            {seatNumber}
                        </button>
                        

                
                    );
                })}
            </div>
            <h3>Selected Seats: {selectedSeats.join(", ") || "None"}</h3>
            <button onClick={handleReserve} disabled={selectedSeats.length === 0}>
                Reserve Selected Seats
            </button>
            
        </div>
    );
};


export default EventId;