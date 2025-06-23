import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import { google } from 'googleapis';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const SHEET_ID = '1G2JrpFBAuQTAN94SlhK1gPkpLMTw8rcQ4J-CdPJ-acs'; // Replace with yours
const auth = new google.auth.GoogleAuth({
  keyFile: 'google-sheets-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let users = {};
const historyFile = 'user_history.json';

if (fs.existsSync(historyFile)) {
  users = JSON.parse(fs.readFileSync(historyFile));
}

async function appendToSheet(name, semester, sgpa, gradesObj) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const gradeStr = gradesObj
    ? Object.entries(gradesObj)
        .map(([subject, grade]) => `${subject}=${grade}`)
        .join(', ')
    : '';

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[new Date().toISOString(), name, semester, sgpa, gradeStr]]
    },
  });
}

app.post('/login', (req, res) => {
  const { name, semester } = req.body;
  if (!name || !semester) return res.status(400).json({ error: 'Name and Semester required' });
  if (!users[name]) users[name] = { semester, history: [] };
  return res.status(200).json({ message: 'Login successful', name });
});

app.post('/save-history', async (req, res) => {
  const { name, semester, result, grades } = req.body;
  if (!name || !result || !semester) return res.status(400).json({ error: 'Missing parameters' });

  if (!users[name]) users[name] = { semester, history: [] };
  users[name].history.push({ date: new Date(), semester, result, grades });

  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));

  try {
    await appendToSheet(name, semester, result, grades);
    res.status(200).json({ message: 'History saved and exported to Google Sheets' });
  } catch (err) {
    console.error("❌ Google Sheets API error:", err);
    res.status(500).json({ error: 'Could not save to Google Sheets' });
  }
});

app.get('/history/:name', (req, res) => {
  const { name } = req.params;
  if (!users[name]) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ history: users[name].history });
});

app.delete('/history/:name', (req, res) => {
  const { name } = req.params;
  if (!users[name]) return res.status(404).json({ error: 'User not found' });

  users[name].history = [];
  fs.writeFileSync(historyFile, JSON.stringify(users, null, 2));
  res.status(200).json({ message: 'History cleared successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 SGPA backend running on port ${PORT}`);
});
