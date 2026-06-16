const express = require('express');
require('dotenv').config({quiet: true});
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const cors = require('cors');

const transporter = require('./modules/mail/SMTP').transporter;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());

app.use(cors({
    origin: "http://localhost:5173", // ajusta pro teu front
    credentials: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('[INFO] Connected to MongoDB');
}).catch((err) => {
    console.error('[ERROR] Error connecting to MongoDB:', err);
});


const mainRoutes = require('./routes/main.routes');
const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');

app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);


app.listen(PORT, async () => {
    try {
        await transporter.verify();
        console.log("[INFO] Server is ready to take our messages");
    } catch (err) {
        console.error("[ERROR] Verification failed:", err);
    }
    console.log(`[INFO] Server is running on port ${PORT}`);
})