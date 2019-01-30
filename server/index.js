'use strict';

require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


// Create server based on express app
const app = express();

// Use cors for retrieve cross domain requests.
app.use(cors());

// Use body parser for parse request and use retrieve data in `req.body`
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Initialize fileUploader. When file retrieve it will be in `req.files`.
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
}));

/**
 * Handle upload image request.
 */
app.post('/api/upload', async (req, res) => {
    try {
        let keys = Object.keys(req.files);
        let imageName = req.files[ keys[ 0 ] ].name;

        // Unique directory of survey
        let uniqueDir = imageName.split('#')[0];

        // Directory to question on specific image.
        let imageDir = imageName.split('#')[1];

        // Image name
        imageName = imageName.split('#')[2];

        let uniqueDirPath = path.join( __dirname, '..', process.env.UPLOAD_PATH, uniqueDir );
        let imageDirPath = path.join( uniqueDirPath, imageDir );
        let filePath = path.join( imageDirPath, imageName );

        // If directory is not exist -> create
        if(!fs.existsSync(uniqueDirPath)) {
            await fs.mkdirSync(uniqueDirPath)
        }

        // If directory is not exist -> create
        if(!fs.existsSync(imageDirPath)) {
            await fs.mkdirSync(imageDirPath)
        }

        // Check if image was stored before. If not -> create. Else send error 400.
        if (fs.existsSync(filePath)) {
            res.sendStatus(400);
        } else {
            req.files[ keys[ 0 ] ].mv( filePath );
            res.send('ok')
        }
    } catch (err) {
        // Handle any system error.
        console.log(err);
        res.sendStatus(500);
    }
});


/**
 * Handle upload image request.
 */
app.post('/api/result', async (req, res) => {
    try {
        let directory = path.join( __dirname, '..', process.env.UPLOAD_PATH, req.body.unique );

        // If directory is not exist -> create
        if(!fs.existsSync(directory)) {
            await fs.mkdirSync(directory)
        }

        // Write results to file.
        var filePath = path.join(directory, 'result.json');
        await fs.writeFileSync(filePath, req.body.result);

        res.send('ok');

    } catch (err) {
        // Handle any system error.
        console.log(err);
        res.sendStatus(500);
    }
});

/**
 * Listen request on SERVER_PORT.
 */
app.listen(process.env.SERVER_PORT, () => {
    console.log('Server ready! http://localhost:' + process.env.SERVER_PORT);
});