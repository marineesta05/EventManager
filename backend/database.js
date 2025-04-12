const postgres = require('postgres');
const dotenv = require('dotenv');

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

module.exports = sql;
