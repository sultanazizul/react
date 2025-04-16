const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', mapRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});