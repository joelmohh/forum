const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express(); 
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});


const mainRoutes = require('./routes/main.routes');
const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');

app.use('/', mainRoutes);   
app.use('/auth', authRoutes);
app.use('/api', apiRoutes); 


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})