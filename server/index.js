'use strict';

require('dotenv').config();

const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Library for generate unique ID.
const uuid = require('uuid/v4');

// Create express app
const app = require('express')();

// Use cors for retrieve cross domain requests.
app.use(cors());

// Create server based on express app
const server = require('http').createServer(app);

// Create websoket server
const io = require('socket.io')(server);

// Analyse module
const Analysis = require('./analysis.js');
Analysis.init();

io.on('connection', (client) => {
    client.on("experiment", (req, response) => {
        switch(req.action) {
            case "start":
                let experiment = uuid();
                console.log("Start experiment: " + experiment);
                return response(experiment);
            case "finish":
                console.log("Finish experiment: " + req.uuid);
                return response("Some conclusion of experiment");
            default:
                return response("error");
        }
    });

    client.on("results", (query, response) => {

    });

    client.on("image", async (req, response) => {
        console.log("Start loading image: " + req.uuid + "/" + req.name);
        let folder = path.join( __dirname, '..', process.env.UPLOAD_PATH, req.uuid );
        if(!await fs.existsSync(folder)) {
            await fs.mkdirSync(folder)
        }
        let image = path.join(folder, req.name);
        await fs.writeFileSync(image, Buffer(req.data, "base64"));
        Analysis.push(image);
        response(req.name);
    })
});

/**
 * Listen request on SERVER_PORT.
 */
server.listen(process.env.SERVER_PORT, () => {
    console.log('Server ready! http://localhost:' + process.env.SERVER_PORT);
});