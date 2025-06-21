import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let users = {};
const historyFile = 'user_history.json';

if (fs.existsSync(historyFile)) {
  users = JSON.parse(fs.readFileSync(historyFile));
}

app.post('/login', (req, res) => {
  const { usn, dob } = req.body;
  if (!usn || !dob) return res.status(400).json({ error: 'USN and DOB required' });
  if (!users[usn]) users[usn] = { dob, history: [] };
  return res.status(200).json({ message: 'Login successful', usn });
});

app.post('/save-history', (req, res) => {
  const { usn, result } = req.body;
  if (!usn || !result) return res.status(400).json({ error: 'Missing parameters' });
  if (!users[usn]) return res.status(404).json({ error: 'User not found' });
  users[usn].history.push({ date: new Date(), result });
  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));
  res.status(200).json({ message: 'History saved' });
});

app.get('/history/:usn', (req, res) => {
  const { usn } = req.params;
  if (!users[usn]) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ history: users[usn].history });
});

app.listen(PORT, () => {
  console.log(`SGPA backend running on port ${PORT}`);
});
