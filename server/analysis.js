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
            'Ocp-Apim-Subscription-Key': '3b0340d7109f4614bf1946de16850c25'
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

let analyseImage = async (imagePath) => {
    let emotions = await getEmotions(imagePath);
    if (emotions) {
        // TODO store data
        // await fs.writeFileSync(resultPath, JSON.stringify(file, null, 4));
        // let rows = "name;user_age;user_gender;score;imageId;imageShot;smile;gender;age;anger;contempt;disgust;fear;happiness;neutral;sadness;surprise\n";
        // rows += data    + ";" + "image" + k + "_" + counter
        //     + ";" + result.smile
        //     + ";" + result.age
        //     + ";" + result.gender
        //     + ";" + result.emotion.anger
        //     + ";" + result.emotion.contempt
        //     + ";" + result.emotion.disgust
        //     + ";" + result.emotion.fear
        //     + ";" + result.emotion.happiness
        //     + ";" + result.emotion.neutral
        //     + ";" + result.emotion.sadness
        //     + ";" + result.emotion.surprise + "\n";
    } else {
        console.error("[Analysis] Face does not detect " + imagePath);
    }
};

let addToQueue_ = (image) => {
    queue.push(image);
};

let init_ = () => {
    setInterval( () => {
        let imagePath = queue.pop();
        if (imagePath) {
            console.log("[Analysis] Start analysis " + imagePath);
            analyseImage(imagePath);
        }
    }, 3 * 1000);
};


module.exports = {
    init: init_,
    push: addToQueue_
};