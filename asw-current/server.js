const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const fs = require("fs");
const upload = multer({storage: multer.memoryStorage()});

app.use(express.static(path.join(__dirname, 'public')));

//use this for laptop
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//use this for tablet
/*const localIP = 'xxx.xx.xxx.xxx';
app.listen(port, localIP, () => {
  console.log(`Server is running on http://${localIP}:${port}`);
});*/

app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("participant_designs.db", (err) => {
  if (err) {
    console.log("Error");
  } else {
    console.log("Connected to SQLite db");
    db.run(`
      CREATE TABLE IF NOT EXISTS participant_designs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_num TEXT NOT NULL,
          video_num TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_data BLOB NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
  `);
  }
});

app.get("/files", (req, res) => {
  db.all("SELECT id, participant_num, video_num, file_name, timestamp FROM participant_designs", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve files" });
    }
    res.json(rows);
  });
});

app.get("/ASWGUIdash", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.post("/upload-csv", upload.single("csv_file"), (req, res) => {
  const {participant_num, video_num} = req.body;
  const fileName = req.file.originalname;
  const fileData = req.file.buffer;
  db.run(`INSERT INTO participant_designs (participant_num, video_num, file_name, file_data) VALUES (?, ?, ?, ?)`, [participant_num, video_num, fileName, fileData]);
});

app.get("/download/:id", (req, res) => {
  const fileID = req.params.id;
  db.get("SELECT file_name, file_data FROM participant_designs WHERE id = ?", [fileID], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader("Content-Disposition", `attachment; filename="${row.file_name}"`);
    res.setHeader("Content-Type", "text/csv");
    res.send(row.file_data);
  });
});

app.delete("/delete/:id", (req, res) => {
  const fileID = req.params.id;
  db.run("DELETE FROM participant_designs WHERE id = ?", [fileID]);
});