import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import { google } from 'googleapis';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const SHEET_ID = '1G2JrpFBAuQTAN94SlhK1gPkpLMTw8rcQ4J-CdPJ-acs'; // Replace this with your actual Sheet ID
const auth = new google.auth.GoogleAuth({
  keyFile: 'google-sheets-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let users = {};
const historyFile = 'user_history.json';

if (fs.existsSync(historyFile)) {
  users = JSON.parse(fs.readFileSync(historyFile));
}

async function appendToSheet(usn, sgpa) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[new Date().toISOString(), usn, sgpa]]
    },
  });
}

app.post('/login', (req, res) => {
  const { usn, dob } = req.body;
  if (!usn || !dob) return res.status(400).json({ error: 'USN and DOB required' });
  if (!users[usn]) users[usn] = { dob, history: [] };
  return res.status(200).json({ message: 'Login successful', usn });
});

app.post('/save-history', async (req, res) => {
  const { usn, result } = req.body;
  if (!usn || !result) return res.status(400).json({ error: 'Missing parameters' });

  if (!users[usn]) return res.status(404).json({ error: 'User not found' });
  users[usn].history.push({ date: new Date(), result });

  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));

  try {
    await appendToSheet(usn, result);
    res.status(200).json({ message: 'History saved and exported to Google Sheets' });
  } catch (err) {
    console.error("❌ Google Sheets API error:", err);
    res.status(500).json({ error: 'Could not save to Google Sheets' });
  }
});

app.get('/history/:usn', (req, res) => {
  const { usn } = req.params;
  if (!users[usn]) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ history: users[usn].history });
});

app.listen(PORT, () => {
  console.log(`SGPA backend running on port ${PORT}`);
});

