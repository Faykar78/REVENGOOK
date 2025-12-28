const express = require('express');
const { Pool } = require('pg');
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

// Database Setup (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Initialize DB Table
pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        content TEXT,
        updatedAt BIGINT
    )
`, (err, res) => {
    if (err) {
        console.error('Error creating table:', err);
    } else {
        console.log('Ensure "notes" table exists.');
    }
});

// Helper to get current timestamp sentries (seconds)
const getTimestamp = () => Math.floor(Date.now() / 1000);

// API Route for module.php simulation
app.post('/api/module', async (req, res) => {
    const { module_act, pad_code, pad_content } = req.body;

    // --- CLEANUP (Lazy Expiration) ---
    // Delete any notes older than 24 hours (86400 seconds)
    // We do this asynchronously to not block the request
    const cleanupCutoff = getTimestamp() - 86400;
    pool.query('DELETE FROM notes WHERE updatedAt <= $1', [cleanupCutoff]).catch(err => {
        console.error('Cleanup error:', err);
    });
    // ---------------------------------

    if (module_act === 'open') {
        if (!pad_code) {
            return res.status(400).json({ errormessage: 'Code is required' });
        }

        try {
            // Filter: Only select notes updated within the last 24 hours
            const { rows } = await pool.query('SELECT content, updatedAt FROM notes WHERE id = $1 AND updatedAt > $2', [pad_code, cleanupCutoff]);

            if (rows.length > 0) {
                // Found existing pad
                res.json({
                    noerror: true,
                    cryptedindex: 'idx_' + pad_code,
                    neworused: 'used',
                    pad_content: rows[0].content,
                    selfdestruct_onTime: false,
                    padlock: false,
                    linenum: false,
                    history: {}
                });
            } else {
                // New pad (or Expired)
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
        } catch (err) {
            console.error(err);
            res.json({ errormessage: 'Database error' });
        }

    } else if (module_act === 'save') {
        if (!pad_code) {
            return res.json({ errormessage: 'Code is required' });
        }

        const timestamp = getTimestamp();

        try {
            await pool.query(
                `INSERT INTO notes (id, content, updatedAt) VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updatedAt = EXCLUDED.updatedAt`,
                [pad_code, pad_content || '', timestamp]
            );

            res.json({
                noerror: true,
                savedbutreloadneeded: false,
                historysaved: {
                    saved: true,
                    name: 'Revision ' + new Date().toISOString(),
                    time: timestamp
                }
            });
        } catch (err) {
            console.error(err);
            res.json({ errormessage: 'Database error' });
        }

    } else if (module_act === 'check_padlock_code') {
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
