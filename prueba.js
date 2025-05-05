const fs = require('fs');
const https = require('https');
const express = require('express');

const app = express();

const options = {
    cert: fs.readFileSync('cert.pem'),
    key: fs.readFileSync('key.pem'),


};

app.get('/', (req, res) => {
    res.send('¡Hola, HTTPS!');
});

https.createServer(options, app).listen(3051, () => {
    console.log('Servidor funcionando en https://localhost:3051');
});