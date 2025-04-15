const express = require("express");
const router = express.Router();
const http = require("http");
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const { Server } = require("socket.io");
const cors = require("cors");
const sql = require("../database.js"); 
const sgMail = require('@sendgrid/mail');
const calendar = require("./calendar");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

app.get("/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    const userId = state; 
    
    try {
        const tokens = await calendar.getTokensFromCode(code);
        
        await calendar.storeUserTokens(userId, tokens, sql);
        
        res.redirect("/calendar-connected");
    } catch (error) {
        console.error("Error during Google auth callback:", error);
        res.status(500).json({ error: "Failed to authenticate with Google" });
    }
});

app.get("/auth/google", (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }
    
    const authUrl = calendar.getAuthUrl();
    res.json({ authUrl: `${authUrl}&state=${userId}` });
});

app.get("/users/:id/calendar-status", async (req, res) => {
    const { id } = req.params;
    
    try {
        const tokens = await calendar.getUserTokens(id, sql);
        res.json({ connected: !!tokens });
    } catch (error) {
        console.error("Error checking calendar status:", error);
        res.status(500).json({ error: "Failed to check calendar status" });
    }
});

app.post("/reserve", async (req, res) => {
    const { user_id, event_id, seat_numbers, email, add_to_calendar } = req.body;

    try {
        const seatIds = [];
        const availableSeats = await sql`
            SELECT COUNT(*) AS available_seats
            FROM seats
            WHERE event_id = ${event_id} AND is_reserved = FALSE
        `;

        if (availableSeats[0].available_seats > 0) {
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

            const eventDetails = await sql`
                SELECT title, datetime, location FROM events WHERE id = ${event_id}
            `;

            let userEmail = email;
            if (!userEmail) {
                const userInfo = await sql`
                    SELECT email FROM users WHERE id = ${user_id}
                `;
                if (userInfo.length > 0 && userInfo[0].email) {
                    userEmail = userInfo[0].email;
                }
            }

            if (userEmail) {
                const formattedDate = new Date(eventDetails[0].datetime).toLocaleString('fr-FR');
                
                const msg = {
                    to: userEmail,
                    from: process.env.SENDGRID_FROM_EMAIL,
                    subject: `Confirmation de réservation - ${eventDetails[0].title}`,
                    text: `Bonjour,\n\nVotre réservation pour l'événement "${eventDetails[0].title}" a été confirmée.\n\nDétails:\n- Date: ${formattedDate}\n- Lieu: ${eventDetails[0].location}\n- Places: ${seat_numbers.join(', ')}\n\nMerci pour votre réservation!\n\nCordialement,\nL'équipe d'organisation`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333; text-align: center;">Confirmation de réservation</h2>
                            <p>Bonjour,</p>
                            <p>Votre réservation pour l'événement <strong>${eventDetails[0].title}</strong> a été confirmée.</p>
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #555;">Détails de l'événement:</h3>
                                <p><strong>Date:</strong> ${formattedDate}</p>
                                <p><strong>Lieu:</strong> ${eventDetails[0].location}</p>
                                <p><strong>Places réservées:</strong> ${seat_numbers.join(', ')}</p>
                            </div>
                            <p>Merci pour votre réservation!</p>
                            <p>Cordialement,<br>L'équipe d'organisation</p>
                        </div>
                    `
                };
                
                await sgMail.send(msg);
                console.log("Confirmation email sent to:", userEmail);
            }
            if (add_to_calendar) {
                try {
                    const tokens = await calendar.getUserTokens(user_id, sql);
                    
                    if (tokens) {
                        if (tokens.expiry_date < Date.now()) {
                            
                            tokens = await calendar.refreshAccessToken(user_id, tokens, sql);
                        }
                        
                        await calendar.addEventToCalendar(tokens.access_token, {
                            title: eventDetails[0].title,
                            location: eventDetails[0].location,
                            datetime: eventDetails[0].datetime,
                            seats: seat_numbers
                        });
                        
                        console.log("Event added to Google Calendar for user:", user_id);
                    }
                } catch (error) {
                    console.error("Error adding event to Google Calendar:", error);
                }
            }
            io.emit("seat_reserved", { eventId: event_id, seatIds: seat_numbers });

            res.status(200).json({ 
                message: "Seats reserved and confirmation email sent", 
                reserved: seat_numbers,
                calendarAdded: add_to_calendar
            });
        } else {
            await sql`
                INSERT INTO waiting_list (user_id, event_id) 
                VALUES (${user_id}, ${event_id})
            `;
            res.status(200).json({ message: "Aucune place disponible, vous êtes ajouté à la liste d'attente." });
        }

    } catch (err) {
        console.error("Reservation error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

app.post("/auth/google/tokens", async (req, res) => {
    const { code, userId } = req.body;
    
    try {
      const tokens = await calendar.getTokensFromCode(code);
      await calendar.storeUserTokens(userId, tokens, sql);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error exchanging code:", error);
      res.status(500).json({ error: "Failed to exchange code" });
    }
  });

server.listen(3003, () => {
    console.log("Reservation Service running on port 3003");
});
