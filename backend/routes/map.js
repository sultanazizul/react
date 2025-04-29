const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Markers
router.get('/markers', authMiddleware, async (req, res) => {
    try {
        const [markers] = await pool.query('SELECT * FROM markers WHERE user_id = ?', [req.user.id]);
        const formattedMarkers = markers.map(marker => ({
            ...marker,
            latitude: Number(marker.latitude),
            longitude: Number(marker.longitude),
        }));
        res.json(formattedMarkers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching markers' });
    }
});

router.post('/markers', authMiddleware, async (req, res) => {
    const { name, latitude, longitude, city, country, village, state, suburb, road, timestamp } = req.body;
    try {
        const formattedTimestamp = timestamp || new Date().toISOString().slice(0, 19).replace("T", " ");
        console.log("Received Marker Data from Frontend:", req.body);
        const dataToSave = {
            user_id: req.user.id,
            name: name || "Unknown Location",
            latitude,
            longitude,
            city: city || "Unknown",
            country: country || "Unknown",
            village: village || "Not available",
            state: state || "Not available",
            suburb: suburb || "Not available",
            road: road || "Not available",
            timestamp: formattedTimestamp,
        };
        console.log("Data to Save in Database:", dataToSave);

        const [result] = await pool.query(
            'INSERT INTO markers (user_id, name, latitude, longitude, city, country, village, state, suburb, road, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                dataToSave.user_id,
                dataToSave.name,
                dataToSave.latitude,
                dataToSave.longitude,
                dataToSave.city,
                dataToSave.country,
                dataToSave.village,
                dataToSave.state,
                dataToSave.suburb,
                dataToSave.road,
                dataToSave.timestamp,
            ]
        );
        console.log("Inserted Marker ID:", result.insertId);
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error("Error adding marker to database:", error);
        res.status(500).json({ message: 'Error adding marker', error: error.message });
    }
});

router.put('/markers/:id', authMiddleware, async (req, res) => {
    const { latitude, longitude, city, country, village, state, suburb, road, timestamp } = req.body;
    try {
        const formattedTimestamp = timestamp || new Date().toISOString().slice(0, 19).replace("T", " ");
        console.log("Received Updated Marker Data from Frontend:", req.body);
        const dataToUpdate = {
            latitude,
            longitude,
            city: city || "Unknown",
            country: country || "Unknown",
            village: village || "Not available",
            state: state || "Not available",
            suburb: suburb || "Not available",
            road: road || "Not available",
            timestamp: formattedTimestamp,
        };
        console.log("Data to Update in Database:", dataToUpdate);

        await pool.query(
            'UPDATE markers SET latitude = ?, longitude = ?, city = ?, country = ?, village = ?, state = ?, suburb = ?, road = ?, timestamp = ? WHERE id = ? AND user_id = ?',
            [
                dataToUpdate.latitude,
                dataToUpdate.longitude,
                dataToUpdate.city,
                dataToUpdate.country,
                dataToUpdate.village,
                dataToUpdate.state,
                dataToUpdate.suburb,
                dataToUpdate.road,
                dataToUpdate.timestamp,
                req.params.id,
                req.user.id,
            ]
        );
        res.json({ message: 'Marker updated' });
    } catch (error) {
        console.error("Error updating marker:", error);
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
    const { points } = req.body; // Hapus color dari req.body
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        const [result] = await pool.query(
            'INSERT INTO polylines (user_id, points, timestamp) VALUES (?, ?, ?)', // Hapus color dari query
            [req.user.id, JSON.stringify(points), timestamp]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding polyline' });
    }
});

router.put('/polylines/:id', authMiddleware, async (req, res) => {
    const { points } = req.body; // Hapus color dari req.body
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        let query = 'UPDATE polylines SET timestamp = ?';
        const params = [timestamp];

        if (points) {
            query += ', points = ?';
            params.push(JSON.stringify(points));
        }

        query += ' WHERE id = ? AND user_id = ?';
        params.push(req.params.id, req.user.id);

        await pool.query(query, params);
        res.json({ message: 'Polyline updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating polyline' });
    }
});

router.delete('/polylines/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM polylines WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Polyline deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting polyline' });
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
    const { points } = req.body; // Hapus color dari req.body
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        const [result] = await pool.query(
            'INSERT INTO polygons (user_id, points, timestamp) VALUES (?, ?, ?)', // Hapus color dari query
            [req.user.id, JSON.stringify(points), timestamp]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding polygon' });
    }
});

router.put('/polygons/:id', authMiddleware, async (req, res) => {
    const { points } = req.body; // Hapus color dari req.body
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        let query = 'UPDATE polygons SET timestamp = ?';
        const params = [timestamp];

        if (points) {
            query += ', points = ?';
            params.push(JSON.stringify(points));
        }

        query += ' WHERE id = ? AND user_id = ?';
        params.push(req.params.id, req.user.id);

        await pool.query(query, params);
        res.json({ message: 'Polygon updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating polygon' });
    }
});

router.delete('/polygons/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM polygons WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Polygon deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting polygon' });
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
    const { center, radius } = req.body; // Hapus color dari req.body
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        const [result] = await pool.query(
            'INSERT INTO circles (user_id, center, radius, timestamp) VALUES (?, ?, ?, ?)', // Hapus color dari query
            [req.user.id, JSON.stringify(center), radius, timestamp]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding circle' });
    }
});

router.put('/circles/:id', authMiddleware, async (req, res) => {
    const { center, radius } = req.body; // Hapus color dari req.body
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        let query = 'UPDATE circles SET timestamp = ?';
        const params = [timestamp];

        if (center) {
            query += ', center = ?';
            params.push(JSON.stringify(center));
        }
        if (radius) {
            query += ', radius = ?';
            params.push(radius);
        }

        query += ' WHERE id = ? AND user_id = ?';
        params.push(req.params.id, req.user.id);

        await pool.query(query, params);
        res.json({ message: 'Circle updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating circle' });
    }
});

router.delete('/circles/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM circles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Circle deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting circle' });
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