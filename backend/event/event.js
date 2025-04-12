const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); 
const socketIo = require('socket.io');
dotenv.config({ path: '../.env' });
const sql = require('../database.js');

const app = express();
const server = http.createServer(app);  

const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", 
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

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
        const eventId = result[0].id;

        
        const seatValues = Array.from({ length: capacity }, (_, i) => [eventId, i + 1]);

        await sql`
            INSERT INTO seats (event_id, seat_number)
            VALUES ${sql(seatValues)}
        `;

        io.emit('eventAdded', result[0]);
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

app.put('/events/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    const { title, location, datetime, capacity } = req.body;
    try{
        const result = await sql`UPDATE events SET 
            title = COALESCE(${title}, title),
            location = COALESCE(${location}, location),
            datetime = COALESCE(${datetime}, datetime),
            capacity = COALESCE(${capacity}, capacity)
        WHERE id = ${id}
        RETURNING id, title, location, datetime, capacity
        `;
        if (result.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        io.emit('eventUpdated', result[0]);
        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/events/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    try{
        const result = await sql`
            DELETE FROM events WHERE id = ${id} RETURNING id
        `;
        if (result.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        io.emit('eventDeleted', { id });
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(400).json({ error: error.message });
    }
});
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(3002, () => console.log("Event Service running on port 3002"));