const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config({ path: '../.env' });
const sql = require('../database.js');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors());
app.use(express.json()); 

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Accès non autorisé' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token invalide' });
      req.user = user;
      next();
    });
};
function checkAdminRole(req, res, next) {
  if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès interdit : admin uniquement' });
  }
  next(); 
}
  
  app.get('/my-tickets', authenticateToken, async (req, res) => {
      const userId = req.user.userId; 
      
      try {
        const tickets = await sql`
        SELECT 
            reservations.id AS ticket_id,
            events.id AS event_id,
            events.title AS event_title,
            events.datetime,
            events.location,
            events.image,
            seats.seat_number
        FROM reservations
        INNER JOIN events ON reservations.event_id = events.id
        INNER JOIN seats ON reservations.seat_id = seats.id
        WHERE reservations.user_id = ${userId}
        ORDER BY events.datetime DESC
    `;
    
    res.status(200).json(tickets);
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Impossible de récupérer les réservations' });
      }
  });


  app.get('/admin/users', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const users = await sql`SELECT id, email FROM users`;
        const reservations = await sql`
            SELECT 
                reservations.user_id,
                events.title AS event_title,
                events.datetime,
                events.location,
                seats.seat_number
            FROM reservations
            INNER JOIN events ON reservations.event_id = events.id
            INNER JOIN seats ON reservations.seat_id = seats.id
        `;
        const userMap = users.map(user => ({
            ...user,
            reservations: reservations
                .filter(r => r.user_id === user.id)
                .map(r => ({
                    event_title: r.event_title,
                    seat_number: r.seat_number,
                    datetime: r.datetime,
                    location: r.location
                }))
        }));

        res.status(200).json(userMap);
    } catch (error) {
        console.error("Erreur dans /admin/users :", error.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.delete('/cancel-ticket/:eventId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const eventId = req.params.eventId;

    try {
        const eventDetails = await sql`
            SELECT title, datetime, location, image
            FROM events
            WHERE id = ${eventId}
        `;

        if (eventDetails.length === 0) {
            return res.status(404).json({ error: "Événement non trouvé" });
        }
        const reservedSeats = await sql`
            SELECT seats.id AS seat_id
            FROM reservations
            INNER JOIN seats ON reservations.seat_id = seats.id
            WHERE reservations.user_id = ${userId} AND reservations.event_id = ${eventId}
        `;

        if (reservedSeats.length === 0) {
            return res.status(404).json({ error: "Aucune réservation trouvée à annuler" });
        }

        const seatIds = reservedSeats.map(row => row.seat_id);

        await sql.begin(async (sql) => {
            await sql`
                DELETE FROM reservations
                WHERE user_id = ${userId} AND event_id = ${eventId}
            `;

            await sql`
                UPDATE seats SET is_reserved = FALSE
                WHERE id = ANY(${seatIds})
            `;

            const waitingUsers = await sql`
                SELECT user_id
                FROM waiting_list
                WHERE event_id = ${eventId}
                LIMIT 1  -- On ne prend que le premier utilisateur de la liste d'attente
            `;

            if (waitingUsers.length > 0) {
                const firstInQueue = waitingUsers[0];

                const seat = await sql`
                    SELECT id
                    FROM seats
                    WHERE event_id = ${eventId} AND is_reserved = FALSE
                    LIMIT 1
                `;

                if (seat.length > 0) {
                    const availableSeat = seat[0];

                    await sql`
                        INSERT INTO reservations (user_id, event_id, seat_id)
                        VALUES (${firstInQueue.user_id}, ${eventId}, ${availableSeat.id})
                    `;

                    await sql`
                        UPDATE seats SET is_reserved = TRUE
                        WHERE id = ${availableSeat.id}
                    `;

                    await sql`
                        DELETE FROM waiting_list
                        WHERE user_id = ${firstInQueue.user_id} AND event_id = ${eventId}
                    `;

                    const userEmail = await sql`
                        SELECT email
                        FROM users
                        WHERE id = ${firstInQueue.user_id}
                    `;

                    if (userEmail.length > 0) {
                        const formattedDate = new Date(eventDetails[0].datetime).toLocaleString('fr-FR');
                        
                        const msg = {
                            to: userEmail[0].email,
                            from: process.env.SENDGRID_FROM_EMAIL,
                            subject: Place disponible pour l'événement ${eventDetails[0].title},
                            text: Bonjour,\n\nUne place vient de se libérer pour l'événement "${eventDetails[0].title}".\n\nDétails:\n- Date: ${formattedDate}\n- Lieu: ${eventDetails[0].location}\n\nMerci de confirmer votre réservation.\n\nCordialement,\nL'équipe d'organisation,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                    <h2 style="color: #333; text-align: center;">Place disponible pour l'événement</h2>
                                    <p>Bonjour,</p>
                                    <p>Une place vient de se libérer pour l'événement <strong>${eventDetails[0].title}</strong>.</p>
                                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #555;">Détails de l'événement:</h3>
                                        <p><strong>Date:</strong> ${formattedDate}</p>
                                        <p><strong>Lieu:</strong> ${eventDetails[0].location}</p>
                                    </div>
                                    <p>Merci de confirmer votre réservation dès que possible.</p>
                                    <p>Cordialement,<br>L'équipe d'organisation</p>
                                </div>
                            `
                        };
                        
                        await sgMail.send(msg);
                        console.log("Email envoyé au premier utilisateur de la liste d'attente:", userEmail[0].email);
                    }
                }
            }
        });

        res.status(200).json({ message: "Réservation annulée et notification envoyée." });
    } catch (error) {
        console.error("Erreur d'annulation de ticket:", error.message);
        res.status(500).json({ error: "Erreur lors de l'annulation de la réservation" });
    }
});
app.listen(3004, () => console.log("Tickets Service running on port 3004"));