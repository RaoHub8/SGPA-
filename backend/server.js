import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import { google } from 'googleapis';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Google Sheets Setup
const credentials = JSON.parse(process.env.GOOGLE_KEY);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = '1G2JrpFBAuQTAN94SlhK1gPkpLMTw8rcQ4J-CdPJ-acs'; // Replace with your actual sheet ID

let users = {};
const historyFile = 'user_history.json';

// Load previous users if any
if (fs.existsSync(historyFile)) {
  users = JSON.parse(fs.readFileSync(historyFile));
}

// Append a row to Google Sheet
async function appendToSheet(name, semester, sgpa) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[new Date().toISOString(), name, semester, sgpa]],
    },
  });
}

// Login route (using name and semester)
app.post('/login', (req, res) => {
  const { name, semester } = req.body;
  if (!name || !semester) return res.status(400).json({ error: 'Name and Semester required' });

  if (!users[name]) users[name] = { semester, history: [] };

  return res.status(200).json({ message: 'Login successful', name });
});

// Save history and update Google Sheet
app.post('/save-history', async (req, res) => {
  const { name, semester, result } = req.body;
  if (!name || !semester || !result) return res.status(400).json({ error: 'Missing parameters' });

  if (!users[name]) return res.status(404).json({ error: 'User not found' });

  users[name].history.push({ date: new Date(), semester, result });

  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));

  try {
    await appendToSheet(name, semester, result);
    res.status(200).json({ message: 'History saved and exported to Google Sheets' });
  } catch (err) {
    console.error("❌ Google Sheets API error:", err);
    res.status(500).json({ error: 'Could not save to Google Sheets' });
  }
});

// Fetch history
app.get('/history/:name', (req, res) => {
  const { name } = req.params;
  if (!users[name]) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ history: users[name].history });
});

// Clear user's history (NEW)
app.delete('/history/:name', (req, res) => {
  const { name } = req.params;
  if (!users[name]) return res.status(404).json({ error: 'User not found' });

  users[name].history = [];
  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));
  res.status(200).json({ message: 'History cleared successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SGPA backend running on port ${PORT}`);
});
