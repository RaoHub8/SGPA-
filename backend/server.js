// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

let users = {};
const historyFile = 'user_history.json';

// Load history from file if exists
if (fs.existsSync(historyFile)) {
  users = JSON.parse(fs.readFileSync(historyFile));
}

// User login/register
app.post('/login', (req, res) => {
  const { usn, dob } = req.body;
  if (!usn || !dob) {
    return res.status(400).json({ error: 'USN and DOB required' });
  }
  if (!users[usn]) {
    users[usn] = { dob, history: [] };
    console.log(`New user registered: ${usn}`);
  }
  return res.status(200).json({ message: 'Login successful', usn });
});

// Save SGPA history for user
app.post('/save-history', (req, res) => {
  const { usn, result } = req.body;
  if (!usn || !result) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  if (!users[usn]) {
    return res.status(404).json({ error: 'User not found' });
  }
  users[usn].history.push({ date: new Date(), result });
  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));
  res.status(200).json({ message: 'History saved' });
});

// Get user history
app.get('/history/:usn', (req, res) => {
  const { usn } = req.params;
  if (!users[usn]) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({ history: users[usn].history });
});

app.listen(PORT, () => {
  console.log(`SGPA backend running on http://localhost:${PORT}`);
});
