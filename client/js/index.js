(function () {
    'use strict';

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

    /**
     * Experiments steps
     */
    var EXPERIMENT_STEPS = [
        {
            id: "image0",
            image: "/images/image0.gif"
        },
        {
            id: "image1",
            image: "/images/image1.gif"
        },
        {
            id: "image2",
            image: "/images/image2.gif"
        },
        {
            id: "image3",
            image: "/images/image3.gif"
        },
        {
            id: "image4",
            image: "/images/image4.gif"
        }
    ];

    /**
     * Settings
     */
    var socketUrl = "http://localhost:2000";
    var currentExperiment = null;
    var socket = io(socketUrl);
    var snapshotTimes = { // Total 3 sec
        before: 200,
        between: 2000,
        after: 800
    };

    socket.on('connect', function() {
        console.info("WS connected");
    });

    socket.on('disconnect', function(){
        console.info("WS disconnect");
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
        document.getElementById("intro").classList.add("hidden");
        document.getElementById("intro").classList.remove("d-flex");
        document.getElementById("result").classList.add("hidden");
        document.getElementById("result").classList.remove("d-flex");
        document.getElementById("experiment").classList.remove("hidden");
        var steps = shuffle(EXPERIMENT_STEPS);
        for (var i = 0; i < steps.length; i++) {
            await showStep_(steps[i])
        }
        finishExperiment_()
    };

    var showStep_ = function(step) {
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
        socket.emit("experiment", {action: "finish", uuid: currentExperiment}, function(resp){
            console.info("Experiment [" + currentExperiment + "] has finished");
            document.getElementById("intro").classList.add("hidden");
            document.getElementById("intro").classList.remove("d-flex");
            document.getElementById("result").classList.remove("hidden");
            document.getElementById("result").classList.add("d-flex");
            document.getElementById("experiment").classList.add("hidden");
            currentExperiment = null;
        });
    };

    var showIntro_ = function() {
        document.getElementById("intro").classList.remove("hidden");
        document.getElementById("intro").classList.add("d-flex");
        document.getElementById("result").classList.add("hidden");
        document.getElementById("result").classList.remove("d-flex");
        document.getElementById("experiment").classList.add("hidden");
    };

    var togglePreview_ = function() {
        document.getElementById("preview").classList.toggle("hidden");
        document.getElementById("previewOpen").classList.toggle("hidden");
    };

    // Add listeners to elements
    document.getElementById("startBtn").addEventListener('click', newExperiment_);
    document.getElementById("resetBtn").addEventListener('click', showIntro_);
    document.getElementsByClassName("js-toggle-preview")[0].addEventListener('click', togglePreview_);
    document.getElementById("previewOpen").addEventListener('click', togglePreview_);


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
        width: 160,
        height: 120,
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

})();
