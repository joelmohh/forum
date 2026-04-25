const express = require('express');
require('dotenv').config();

const app = express(); 
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index')
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})