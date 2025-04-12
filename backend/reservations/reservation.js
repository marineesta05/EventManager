const express = require("express");
const http = require("http");
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const { Server } = require("socket.io");
const cors = require("cors");
const sql = require("../database.js"); 


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());


io.on("connection", (socket) => {
    console.log("Client connected to WebSocket");

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});


app.get("/events/:id/seats", async (req, res) => {
    const { id } = req.params;
    try {
        const seats = await sql`
            SELECT seat_number, is_reserved
            FROM seats
            WHERE event_id = ${id}
            ORDER BY seat_number
        `;
        res.status(200).json(seats);
    } catch (err) {
        console.error("Erreur dans /events/:id/seats =>", err.message, err.stack);
        res.status(500).json({ error: "Failed to fetch seats" });
    }
});



app.post("/reserve", async (req, res) => {
    const { user_id, event_id, seat_numbers } = req.body;

    try {
        const seatIds = [];

        await sql.begin(async (sql) => {
            for (const seatNumber of seat_numbers) {
                const seat = await sql`
                    SELECT id, is_reserved FROM seats
                    WHERE event_id = ${event_id} AND seat_number = ${seatNumber}
                    FOR UPDATE
                `;

                if (!seat[0]) {
                    throw new Error(`Seat ${seatNumber} does not exist`);
                }

                if (seat[0].is_reserved) {
                    throw new Error(`Seat ${seatNumber} already reserved`);
                }

                const seatId = seat[0].id;

                await sql`
                    INSERT INTO reservations (user_id, event_id, seat_id)
                    VALUES (${user_id}, ${event_id}, ${seatId})
                `;

                await sql`
                    UPDATE seats SET is_reserved = TRUE WHERE id = ${seatId}
                `;

                seatIds.push(seatId);
            }
        });

        
        io.emit("seat_reserved", {
            eventId: event_id,
            seatIds: seat_numbers,
        });

        res.status(200).json({ message: "Seats reserved", reserved: seat_numbers });
    } catch (err) {
        console.error("Reservation error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

server.listen(3003, () => {
    console.log("Reservation Service running on port 3003");
});
