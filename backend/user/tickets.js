const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config({ path: '../.env' });
const sql = require('../database.js');

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
app.listen(3004, () => console.log("Tickets Service running on port 3004"));