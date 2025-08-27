const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const fs = require("fs");
const upload = multer({storage: multer.memoryStorage()});
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/ASWGUIdash', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const db = new sqlite3.Database("participant_designs.db", (err) => {
  if (err) {
    console.log("Error:", err);
  } else {
    console.log("Connected to SQLite db");
    db.run(`
      CREATE TABLE IF NOT EXISTS participant_designs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_num TEXT NOT NULL,
          video_num TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_data BLOB NOT NULL,
          gui_img1 BLOB NOT NULL,
          gui_img2 BLOB NOT NULL,
          keystroke_data BLOB NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

app.get("/files", (req, res) => {
  db.all("SELECT id, participant_num, video_num, file_name, gui_img1, gui_img2, keystroke_data, timestamp FROM participant_designs", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve files" });
    }
    res.json(rows);
  });
});

app.post("/upload-csv", upload.fields([
  {name: "csv_file", maxCount: 1}, 
  {name: "gui_image1", maxCount: 1}, 
  {name: "gui_image2", maxCount: 1}, 
  {name: "keystroke_file", maxCount: 1}
]), (req, res) => {
  const {participant_num, video_num} = req.body;
  const fileName = req.files["csv_file"][0].originalname;
  const fileData = req.files["csv_file"][0].buffer;
  const guiImg1 = req.files["gui_image1"][0].buffer;
  const guiImg2 = req.files["gui_image2"][0].buffer;
  const keystrokeData = req.files["keystroke_file"][0].buffer;
  
  db.run(
    `INSERT INTO participant_designs (participant_num, video_num, file_name, file_data, gui_img1, gui_img2, keystroke_data) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [participant_num, video_num, fileName, fileData, guiImg1, guiImg2, keystrokeData],
    (err) => {
      if (err) {
        console.error("Error saving to database:", err);
        return res.status(500).json({ error: "Failed to save design" });
      }
      res.json({ message: "Design submitted successfully!" });
    }
  );
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

app.get("/download-keystrokes/:id", (req, res) => {
  const fileID = req.params.id;
  db.get("SELECT file_name, keystroke_data FROM participant_designs WHERE id = ?", [fileID], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader("Content-Disposition", `attachment; filename="keystrokes_${row.file_name}"`);
    res.setHeader("Content-Type", "text/csv");
    res.send(row.keystroke_data);
  });
});

app.get("/download-image/:id/:which", (req, res) => {
  const {id, which} = req.params;
  const col = which === "1" ? "gui_img1" : "gui_img2";
  
  db.get(`SELECT ${col} FROM participant_designs WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.setHeader("Content-Disposition", `attachment; filename="gui_${id}_${which}.png"`);
    res.setHeader("Content-Type", "image/png");
    res.send(row[col]);
  });
});

app.delete("/delete/:id", (req, res) => {
  const fileID = req.params.id;
  db.run("DELETE FROM participant_designs WHERE id = ?", [fileID], (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete file" });
    }
    res.json({ message: "File deleted successfully" });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
