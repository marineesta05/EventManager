const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io");
dotenv.config({ path: '../.env' });
const sql = require('../database.js');

const app = express();
const server = http.createServer(app);  

const io = new Server(server, {
    cors: { 
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
    console.log("Client connected to WebSocket:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

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
        const event = result[0];
        const eventId = event.id;
        
        const seatValues = Array.from({ length: capacity }, (_, i) => [eventId, i + 1]);

        await sql`
            INSERT INTO seats (event_id, seat_number)
            VALUES ${sql(seatValues)}
        `;

        console.log('Emitting eventAdded with data:', event);
        io.emit('eventAdded', event);
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/events', async (req, res) => {
    try {
        console.log('Fetching all events...');
        const result = await sql`SELECT * FROM events ORDER BY datetime ASC`;
        console.log(`Events fetched: ${result.length} events`);
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
        const result = await sql`SELECT * FROM events WHERE id = ${id}`;
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
    const { title, location, datetime, capacity, image } = req.body;
    try {
        const currentEvent = await sql`SELECT * FROM events WHERE id = ${id}`;
        
        if (currentEvent.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        const current = currentEvent[0];
        console.log('TYPE CHECK:', {
            capacity,
            typeofCapacity: typeof capacity,
            
          });
          
        const result = await sql`
            UPDATE events SET 
                title = COALESCE(${title}, ${current.title}),
                location = COALESCE(${location}, ${current.location}),
                datetime = COALESCE(${datetime}, ${current.datetime}),
                capacity = COALESCE(${capacity}::int, ${current.capacity}),
                image = COALESCE(${image}, ${current.image})
            WHERE id = ${id}
            RETURNING id, title, location, datetime, capacity, image
        `;

        const updatedEvent = result[0];
        console.log('Event updated, emitting eventUpdated with data:', updatedEvent);
        io.emit('eventUpdated', updatedEvent);
        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/events/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    try {
        const eventToDelete = await sql`SELECT * FROM events WHERE id = ${id}`;
        
        if (eventToDelete.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        const eventTitle = eventToDelete[0].title;
        await sql`DELETE FROM seats WHERE event_id = ${id}`;
        await sql`DELETE FROM events WHERE id = ${id}`;
        
        console.log('Event deleted, emitting eventDeleted with id:', id, 'and title:', eventTitle);
        io.emit('eventDeleted', { id: parseInt(id), title: eventTitle });
        res.status(200).json({ message: 'Event deleted successfully', title: eventTitle });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(400).json({ error: error.message });
    }
});
server.listen(3002, () => console.log("Event Service running on port 3002"));