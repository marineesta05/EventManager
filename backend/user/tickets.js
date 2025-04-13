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

  
app.listen(3004, () => console.log("Tickets Service running on port 3004"));