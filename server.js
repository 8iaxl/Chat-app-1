// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now()+'-'+file.originalname)
});
const upload = multer({ storage });

const db = new sqlite3.Database('shat.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, pin TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    type TEXT,
    content TEXT,
    timestamp INTEGER
  )`);
});

app.post('/api/signup', (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin || !/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'بيانات غير صالحة' });
  db.run(`INSERT INTO users(username,pin) VALUES(?,?)`, [username, pin], err => {
    if (err) return res.status(409).json({ error: 'اسم مستخدم مكرر' });
    res.json({ success:true });
  });
});

app.post('/api/login', (req, res) => {
  const { username, pin } = req.body;
  db.get(`SELECT * FROM users WHERE username=? AND pin=?`, [username, pin], (e, row) => {
    if (e) return res.status(500).json({ error:'خطأ داخلي' });
    if (!row) return res.status(401).json({ error:'بيانات غير صحيحة' });
    res.json({ success:true });
  });
});

app.get('/api/users', (req, res) => {
  db.all(`SELECT username FROM users`, [], (e, rows) => {
    if (e) return res.status(500).json({ error:'خطأ' });
    res.json({ users: rows.map(r => r.username) });
  });
});

app.post('/api/send', upload.single('file'), (req, res) => {
  const { from, to, type, text } = req.body;
  let content = text || '';
  if (req.file) content = '/uploads/' + req.file.filename;
  db.run(`INSERT INTO messages(from_user,to_user,type,content,timestamp)
          VALUES(?,?,?,?,?)`, [from, to, type, content, Date.now()], function(e) {
    if (e) return res.status(500).json({ error:'فشل الحفظ' });
    res.json({ success:true, id:this.lastID });
  });
});

app.get('/api/messages', (req, res) => {
  const { u1, u2 } = req.query;
  db.all(`SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY timestamp ASC`,
    [u1, u2, u2, u1], (e, rows) => {
      if (e) return res.status(500).json({ error:'خطأ' });
      res.json({ messages: rows });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shat server running on port ${PORT}`));