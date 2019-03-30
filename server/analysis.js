'use strict';

require('dotenv').config();

const fs = require('fs');
const axios = require('axios');

let queue = [];

let sleep = async (time) => {
    console.log("[Analysis] Sleep " + time + " sec.");
    return new Promise(resolve => {
        setTimeout(resolve, time * 1000);
    });
};

let getEmotions = async (imagePath) => {
    return await axios({
        method: 'POST',
        url: 'https://northeurope.api.cognitive.microsoft.com/face/v1.0/detect',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION
        },
        params: {
            returnFaceId : false,
            returnFaceLandmarks: "false",
            returnFaceAttributes : 'age,gender,smile,emotion'
        },
        data: await fs.readFileSync(imagePath.toString())
    }).then(response => {
        console.log("[Analysis] Finish analysis " + imagePath);
        return response.data[ 0 ] ? response.data[ 0 ].faceAttributes : null;
    }).catch(async error => {
        try {
            error = error && error.response && error.response.data ? error.response.data.error : { code: "RateLimitExceeded" };
            console.error("[Analysis] Error: " + JSON.stringify(error));
            if (error.statusCode === 429) {
                await sleep(3);
                return getEmotions(imagePath);
            } else if (error.code === "RateLimitExceeded") {
                await sleep(3);
                return getEmotions(imagePath);
            }
            return null;
        } catch(err) {
            console.error("[Analysis] Error: " + err.toString());
            await sleep(3);
            return getEmotions(imagePath);
        }
    })
};

let analyseImage = async (imagePath, client) => {
    let result = await getEmotions(imagePath);
    if (!result) {
        // return console.error("[Analysis] Face does not detect " + imagePath);
        console.error("[Analysis] Face does not detect " + imagePath);
    }
    let arr = imagePath.toString().split("/");
    let image = arr.pop();
    result = Object.assign({ image: image }, result);
    client.emit("result", result);
    // TODO store data
    await fs.writeFileSync(arr.join("/") + "/" + image.split(".")[0] + ".json", JSON.stringify(result, null, 4));
};

let addToQueue_ = (image, client) => {
    queue.push({image: image, client: client});
};

let init_ = () => {
    setInterval( () => {
        let task = queue.shift();
        if (task && task.image) {
            console.log("[Analysis] Start analysis " + task.image);
            analyseImage(task.image, task.client);
        }
    }, 3 * 1000);
};


module.exports = {
    init: init_,
    push: addToQueue_
};