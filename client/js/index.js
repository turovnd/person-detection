(function () {
    'use strict';

    /**
     * Settings
     */
    var socketUrl = "http://localhost:2000";
    var currentExperiment = null;
    var currentResults = { metadata: { age: [], gender: [], smile: [] }, steps: {} };
    var socket = io(socketUrl);
    var snapshotTimes = { // Total 3 sec
        before: 300,
        between: 3000,
        after: 700
    };

    /**
     * Experiments steps
     */
    var EXPERIMENT_STEPS = [
        {
            id: "sadness",
            image: "/images/sadness.gif"
        },
        {
            id: "neutral",
            image: "/images/neutral.gif"
        },
        {
            id: "happiness",
            image: "/images/happiness.gif"
        }
    ];

    socket.on('connect', function() {
        console.info("WS connected");
    });

    socket.on('disconnect', function(){
        console.info("WS disconnect");
    });

    socket.on("result", function(result) {
        console.log(result)
        if (result.image) {
            var imageId = result.image.split(".")[ 0 ];
            currentResults.steps[imageId] = result.emotion;
            if (result.age)
                currentResults.metadata.age.push(result.age);
            if (result.gender)
                currentResults.metadata.gender.push(result.gender);
            if (result.smile)
                currentResults.metadata.smile.push(result.smile);
            updateResults()
        }
    });

    var newExperiment_ = function() {
        socket.emit("experiment", {action:"start", uuid: null}, function(uuid) {
            if (currentExperiment) {
               return console.error("Experiment [" + currentExperiment + "] has not finished")
            }
            console.info("Experiment [" + uuid + "] has started");
            currentExperiment = uuid;
            startExperiment_();
        });
    };

    var sendImage_ = function(id, index, data) {
        var obj = {
            uuid: currentExperiment,
            name: id + "_" + index + ".png",
            data: data
        };
        socket.emit("image", obj, function(name) {
            console.info("Image [" + name + "] was uploaded");
        });
    };


    var startExperiment_ = async function() {
        $('#intro').addClass("hidden").removeClass("d-flex");
        $('#result').addClass("hidden").removeClass("d-flex");
        $('#experiment').removeClass("hidden");
        var steps = shuffle(EXPERIMENT_STEPS);
        for (var i = 0; i < steps.length; i++) {
            await showStep_(steps[i]);
        }
        finishExperiment_();
    };

    var showStep_ = function(step) {
        $('#experiment').css("background-image", "url('" + step.image + "')");
        return new Promise(async function(resolve) {
            await sleep(snapshotTimes.before);
            sendImage_(step.id, "first", getSnapshot_());
            await sleep(snapshotTimes.between);
            sendImage_(step.id, "second", getSnapshot_());
            await sleep(snapshotTimes.after);
            resolve();
        })
    };

    var finishExperiment_ = function() {
        socket.emit("experiment", {action: "finish", uuid: currentExperiment}, function(){
            console.info("Experiment [" + currentExperiment + "] has finished");
            $('#intro').addClass("hidden").removeClass("d-flex");
            $('#result').removeClass("hidden").addClass("d-flex");
            $('#experiment').addClass("hidden");
            $('#resultBlock').html("<h2><i class='fa fa-spin fa-spinner' aria-hidden='true'></i> Please wait, data is processed</h2>");
            $('#resetBtn').attr('disabled', true).addClass("hidden");
            currentExperiment = null;
        });
    };

    var getResult_ = function (first, second) {
        var res = {}
        for(var attr in first) {
            // TODO формула
            res[attr] = (second[attr] - first[attr]).toFixed(3)
        }
        return res;
    };

    var updateResults = function() {
        if (Object.keys(currentResults.steps).length === EXPERIMENT_STEPS.length * 2) {
            $('#resetBtn').attr('disabled', false).removeClass("hidden");

            $('#resultBlock').html("<table class='table'><thead><tr>" +
                    "<th>IMAGE</th>" + (EXPERIMENT_STEPS.map(el => { return "<th>" + el.id.toUpperCase() + "</th>" })).join("") + "<th>RESULT</th>" +
                "</tr></thead><tbody>" +
                    EXPERIMENT_STEPS.map(el => {
                        var first = currentResults.steps[ el.id + "_first" ];
                        var second = currentResults.steps[ el.id + "_second" ];
                        var result = getResult_(first, second);
                        var img = el.image.split("/");
                        var success = false;
                        return "<tr>" +
                            "<td>" + img[img.length - 1].split(".")[0] + "</td>" +
                            EXPERIMENT_STEPS.map(el1 => {
                                if (el === el1 && result[el1.id] > 0)
                                    success = true;
                                if (result[el1.id] > 0)
                                    return "<td class='text-success'>" + result[el1.id] +  "</td>";
                                else
                                    return "<td class='text-danger'>" + result[el1.id] +  "</td>";
                            }).join("") +
                            (success
                                ? "<td class='text-success'>increase</td>"
                                : "<td class='text-danger'>decrease</td>"
                            ) +
                        "</tr>"
                    }).join("") +
                "</tbody></table>");
        }

        var ages = currentResults.metadata.age;
        var genders = currentResults.metadata.gender;
        var smiles = currentResults.metadata.smile;

        if (ages.length)
            $("#ageBlock").html(
                parseInt(ages.reduce((a,b) => { return a + b }) / ages.length)
            );

        if (genders.length)
            $("#genderBlock").html(
                genders.filter(a => { return a.toUpperCase() === "MALE" }).length > genders.filter(a => { return a.toUpperCase() === "FEMALE" }).length
                ? "Male" : "Female"
            );

        if (smiles.length)
            $("#smileBlock").html(
                smiles.map(el => { return el >= 0.5 }).filter(el => { return el === true }).length
                ? "True" : "False"
            );
    };


    var showIntro_ = function() {
        $('#intro').addClass("d-flex").removeClass("hidden");
        $('#result').addClass("hidden").removeClass("d-flex");
        $('#experiment').addClass("hidden");
        $("#ageBlock").html("-");
        $("#genderBlock").html("-");
        $("#smileBlock").html("-");
        currentResults = { metadata: { age: [], gender: [], smile: [] }, steps: {} };
    };

    var togglePreview_ = function() {
        $("#preview").toggleClass("hidden");
        $("#previewOpen").toggleClass("hidden");
    };

    // Add listeners to elements
    $("#startBtn").click( newExperiment_ );
    $("#resetBtn").click( showIntro_ );
    $(".js-toggle-preview").click( togglePreview_ );


    /**
     *
     * Functions for web camera
     *  - cameraDeviceError
     *  - cameraDeviceSuccess
     *  - initCamera
     *  - createSnapshot
     *
     *  CameraOptions - JSON with settings for initCamera.
     */

    /**
     * Options for initialization web-camera.
     */
    var cameraOptions = {
        audio: false,
        video: true,
        el: "preview",
        extern: null,
        append: true,
        width: 200,
        height: 150,
        mode: "callback",
        quality: 100,
        context: "",
        debug: function () {},
        onTick: function () {},
        onSave: function () {},
        onLoad: function () {},
        onCapture: function () {
            window.webcam.save();
        }
    };

    /**
     * Show alert that camera is not available.
     */
    var cameraDeviceError = function (error) {
        alert('No camera available.');
        console.error('An error occurred: [CODE ' + error.code + ']');
    };

    /**
     * Set video stream from camera to hidden video block.
     */
    var cameraDeviceSuccess = function (stream) {
        if (cameraOptions.context === 'webrtc') {
            var video = cameraOptions.videoEl;
            if ((typeof MediaStream !== "undefined" && MediaStream !== null) && stream instanceof MediaStream) {
                if (video.mozSrcObject !== undefined) { //FF18a
                    video.mozSrcObject = stream;
                } else { //FF16a, 17a
                    video.srcObject = stream;
                }
                return video.play();
            } else {
                var vendorURL = window.URL || window.webkitURL;
                video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
            }
            video.onerror = function () {
                stream.stop();
            };
        }
    };

    /**
     * Create and snapshot
     *
     * @return String - image string
     */
    var getSnapshot_ = function ( ) {
        if (cameraOptions.context === 'webrtc') {
            var video = document.getElementsByTagName('video')[0];
            var canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            return canvas.toDataURL('image/png', 1).split(",")[1];
        }
    };

    /**
     * Initialize camera.
     */
    var initCamera = function () {
        getUserMedia(cameraOptions, cameraDeviceSuccess, cameraDeviceError);
        window.webcam = cameraOptions;
    };


    if (!window["%hammerhead%"]) {
        initCamera();
    } else {
        console.error("Error while initialization");
        alert("Error - watch console.");
    }

    /**
     * Shuffle array elements.
     *
     * @param a {array}
     * @return {array}
     */
    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /**
     * Sleep function
     */
    function sleep(time) {
        return new Promise(function (resolve) {
            setTimeout(resolve, time);
        });
    }

})();
