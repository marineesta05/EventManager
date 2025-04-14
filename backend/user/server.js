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



app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = await sql`
            INSERT INTO users (email, password, role)
            VALUES (${email}, ${hashedPassword}, 'USER')
            RETURNING id, email, role
        `;
        const user = result[0];
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' }); 

        res.status(201).json({ token, user });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(400).json({ error: error.message });
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = result[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
        { userId: user.id, role: user.role }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});



app.listen(3001, () => console.log("User Service running on port 3001"));
