'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

let sleep = async (time) => {
    console.log("Sleep " + time + " sec.");
    return new Promise(resolve => {
        setTimeout( () => { resolve() }, time * 1000);
    })
};

let getDirectories = async (path) => {
    return await fs.readdirSync(path).filter(file => {
        return fs.statSync(path + '/' + file).isDirectory();
    });
};

let getFiles = async (path) => {
    return await fs.readdirSync(path).filter(file => {
        return fs.statSync(path + '/' + file).isFile();
    });
};

let getImages = async (personPath) => {
    let experiments = await getDirectories(personPath);
    var result = [];
    for (let i in experiments) {
        let experimentPath = personPath + '/' + experiments[i];
        let images = await getFiles(experimentPath);
        result = result.concat(images.map(file => {
            return experimentPath + '/' + file
        }));
    }
    return result;
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
        return response.data[ 0 ].faceAttributes;
    }).catch(async error => {
        error = error.response.data.error;
        console.log("Error " + JSON.stringify(error));
        if (error.statusCode === 429) {
            await sleep(parseInt(error.message.replace(/[^0-9]/g, '')));
            return getEmotions(imagePath);
        } else if (error.code === "RateLimitExceeded") {
            await sleep(60);
            return getEmotions(imagePath);
        }
        return {}
    })
};

let analyseImage = async (resultPath, imagePath) => {
    let arr = imagePath.toString().split('/');
    let index = arr[arr.length - 2] + "_" + arr[arr.length - 1].split("-")[1].split(".")[0];
    console.log("Analysis [" + index + "] by path " + imagePath);
    let file = await fs.readFileSync(resultPath);
    file = JSON.parse(file.toString());
    file[index] = await getEmotions(imagePath);
    await fs.writeFileSync(resultPath, JSON.stringify(file, null, 4));
};

let init = async () => {
    try {
        let uploadPath = path.join( __dirname, process.env.UPLOAD_PATH);
        let people = await getDirectories(uploadPath);
        for (let i in people) {
            let personPath = uploadPath  + '/' + people[i];
            let images = await getImages(personPath);
            let resultPath = path.join(personPath + "/result.json");
            console.log("Person [" + people[i] + "] images: " + images.length);

            while(images.length !== 0) {
                // Get by image and analyse it.
                await analyseImage(resultPath, images.splice(0, 1));
                console.log("Images left: " + images.length)
            }
            let csvPath = path.join(personPath + "/result.csv");
            let input = await fs.readFileSync(resultPath);
            input = JSON.parse(input.toString());

            let metaData = input.name + ";" + input.age + ";" + input.gender;

            let rows = "name;user_age;user_gender;score;imageId;imageShot;smile;gender;age;anger;contempt;disgust;fear;happiness;neutral;sadness;surprise\n";

            for (let k = 0; k < (await getDirectories(personPath)).length; k++) {
                let score = input["image" + k];
                let data = metaData + ";" + score + ";" + "image" + k;
                let counter = 0;
                while (counter < 50) {
                    let result = input["image" + k + "_" + counter];
                    if (result) {
                        rows += data    + ";" + "image" + k + "_" + counter
                                        + ";" + result.smile
                                        + ";" + result.age
                                        + ";" + result.gender
                                        + ";" + result.emotion.anger
                                        + ";" + result.emotion.contempt
                                        + ";" + result.emotion.disgust
                                        + ";" + result.emotion.fear
                                        + ";" + result.emotion.happiness
                                        + ";" + result.emotion.neutral
                                        + ";" + result.emotion.sadness
                                        + ";" + result.emotion.surprise + "\n";
                    }
                    counter++
                }
            }
            await fs.writeFileSync(csvPath, rows);
            console.log("Person [" + people[i] + "] finished");
        }
    } catch(err) {
        console.error(err);
    }
};

init();