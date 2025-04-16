const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Markers
router.get('/markers', authMiddleware, async (req, res) => {
    try {
        const [markers] = await pool.query('SELECT * FROM markers WHERE user_id = ?', [req.user.id]);
        res.json(markers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching markers' });
    }
});

router.post('/markers', authMiddleware, async (req, res) => {
    const { name, latitude, longitude, city, country } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO markers (user_id, name, latitude, longitude, city, country) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, name, latitude, longitude, city, country]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding marker' });
    }
});

router.put('/markers/:id', authMiddleware, async (req, res) => {
    const { latitude, longitude, city, country } = req.body;
    try {
        await pool.query(
            'UPDATE markers SET latitude = ?, longitude = ?, city = ?, country = ? WHERE id = ? AND user_id = ?',
            [latitude, longitude, city, country, req.params.id, req.user.id]
        );
        res.json({ message: 'Marker updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating marker' });
    }
});

router.delete('/markers/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM markers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Marker deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting marker' });
    }
});

router.delete('/markers', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM markers WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All markers deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting all markers' });
    }
});

// Polylines
router.get('/polylines', authMiddleware, async (req, res) => {
    try {
        const [polylines] = await pool.query('SELECT * FROM polylines WHERE user_id = ?', [req.user.id]);
        res.json(polylines);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching polylines' });
    }
});

router.post('/polylines', authMiddleware, async (req, res) => {
    const { points } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO polylines (user_id, points) VALUES (?, ?)',
            [req.user.id, JSON.stringify(points)]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding polyline' });
    }
});

router.delete('/polylines', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM polylines WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All polylines deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting all polylines' });
    }
});

// Polygons
router.get('/polygons', authMiddleware, async (req, res) => {
    try {
        const [polygons] = await pool.query('SELECT * FROM polygons WHERE user_id = ?', [req.user.id]);
        res.json(polygons);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching polygons' });
    }
});

router.post('/polygons', authMiddleware, async (req, res) => {
    const { points } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO polygons (user_id, points) VALUES (?, ?)',
            [req.user.id, JSON.stringify(points)]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding polygon' });
    }
});

router.delete('/polygons', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM polygons WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All polygons deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting all polygons' });
    }
});

// Circles
router.get('/circles', authMiddleware, async (req, res) => {
    try {
        const [circles] = await pool.query('SELECT * FROM circles WHERE user_id = ?', [req.user.id]);
        res.json(circles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching circles' });
    }
});

router.post('/circles', authMiddleware, async (req, res) => {
    const { center, radius } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO circles (user_id, center, radius) VALUES (?, ?, ?)',
            [req.user.id, JSON.stringify(center), radius]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding circle' });
    }
});

router.delete('/circles', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM circles WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All circles deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting all circles' });
    }
});

module.exports = router;