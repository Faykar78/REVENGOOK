const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve Static Frontend
app.use(express.static(path.join(__dirname, 'client')));

// Database Setup
const dbPath = path.resolve(__dirname, 'notes.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            content TEXT,
            updatedAt INTEGER
        )`);
    }
});

// Helper to get current timestamp
const getTimestamp = () => Math.floor(Date.now() / 1000);

// API Route for module.php simulation
app.post('/api/module', (req, res) => {
    const { module_act, pad_code, pad_content } = req.body;

    // console.log(`Received request: ${module_act} for code: ${pad_code}`);

    if (module_act === 'open') {
        if (!pad_code) {
            return res.status(400).json({ errormessage: 'Code is required' });
        }

        db.get('SELECT content, updatedAt FROM notes WHERE id = ?', [pad_code], (err, row) => {
            if (err) {
                return res.json({ errormessage: err.message });
            }
            if (row) {
                // Found existing pad
                res.json({
                    noerror: true,
                    cryptedindex: 'idx_' + pad_code, // Dummy index
                    neworused: 'used',
                    pad_content: row.content,
                    selfdestruct_onTime: false,
                    padlock: false,
                    linenum: false,
                    history: {} // History not implemented for now
                });
            } else {
                // New pad
                res.json({
                    noerror: true,
                    cryptedindex: 'idx_' + pad_code,
                    neworused: 'new',
                    pad_content: '',
                    selfdestruct_onTime: false,
                    padlock: false,
                    linenum: false,
                    history: {}
                });
            }
        });
    } else if (module_act === 'save') {
        if (!pad_code) {
            return res.json({ errormessage: 'Code is required' });
        }

        const timestamp = getTimestamp();

        // Upsert logic
        db.run(`INSERT INTO notes (id, content, updatedAt) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET content=excluded.content, updatedAt=excluded.updatedAt`,
            [pad_code, pad_content || '', timestamp],
            function (err) {
                if (err) {
                    return res.json({ errormessage: err.message });
                }
                res.json({
                    noerror: true,
                    savedbutreloadneeded: false,
                    historysaved: {
                        saved: true,
                        name: 'Revision ' + new Date().toISOString(),
                        time: timestamp
                    }
                });
            }
        );
    } else if (module_act === 'check_padlock_code') {
        // Dummy implementation
        res.json({ noerror: true, valid: true });
    } else {
        res.json({ errormessage: 'Unknown action' });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
