const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config({ path: '../.env' });
const sql = require('../database.js');

const app = express();
app.use(cors());
app.use(express.json()); 


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Missing token' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        req.userRole = user.role; 
        next();
    });
}

function checkAdminRole(req, res, next) {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Forbidden admin access only' });
    }
    next(); 
}


app.post('/events', authenticateToken, checkAdminRole, async (req, res) => {
    const { image, title, location, datetime, capacity } = req.body;

    try {
        const result = await sql`
            INSERT INTO events (image, title, location, datetime, capacity)
            VALUES (${image}, ${title}, ${location}, ${datetime}, ${capacity})
            RETURNING id, image, title, location, datetime, capacity
        `;
        res.status(201).json(result[0]);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/events', async (req, res) => {
    try {
        console.log('Fetching all events...');
        const result = await sql `SELECT * FROM events`;
        console.log('Events fetched:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/events/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Fetching event with ID:', id);
    try {
        const result = await sql`SELECT * FROM events WHERE id = ${id}` ;
        if (result.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(400).json({ error: error.message });
    }
});

app.listen(3002, () => console.log("Event Service running on port 3002"));