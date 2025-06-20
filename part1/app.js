var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Database connection (assuming dogwalks.sql has already been executed)
let db;

(async () => {
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });
    console.log('Connected to DogWalkService database');
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
})();

// 1. Route to get all dogs with owner usernames
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(dogs);
  } catch (err) {
    console.error('Error in /api/dogs:', err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// 2. Route to get all open walk requests
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(requests);
  } catch (err) {
    console.error('Error in /api/walkrequests/open:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

// 3. Route to get walker summary with ratings
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [summary] = await db.execute(`
      SELECT
        u.username AS walker_username,
        COUNT(wr.rating_id) AS total_ratings,
        AVG(wr.rating) AS average_rating,
        COUNT(DISTINCT wr.request_id) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id, u.username
    `);
    res.json(summary);
  } catch (err) {
    console.error('Error in /api/walkers/summary:', err);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

// Static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
