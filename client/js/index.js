(function () {
    'use strict';

    /**
     *
     * Functions for web camera
     *  - cameraDeviceError
     *  - cameraDeviceSuccess
     *  - initCamera
     *  - createSnapshot
     *
     *  CameraOptions - JSON with settings for initCamera.
     *
     */

    /**
     * Options for initialization web-camera.
     */
    var cameraOptions = {
        audio: false,
        video: true,
        el: "webcam",
        extern: null,
        append: true,
        width: 640,
        height: 480,
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
     * Initialize camera.
     */
    var initCamera = function () {
        getUserMedia(cameraOptions, cameraDeviceSuccess, cameraDeviceError);
        window.webcam = cameraOptions;
    };


    /**
     * Create and send snapshot to server.
     *
     * @param imageName
     */
    var createSnapshot = function ( imageName ) {
        if (cameraOptions.context === 'webrtc') {
            var video = document.getElementsByTagName('video')[0];
            var canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            var dataUri = canvas.toDataURL('image/' + format, 1);
            var data = dataUri.split(',')[1];

            var bytes = window.atob(data);
            var arr = new Uint8Array( new ArrayBuffer(bytes.length) );

            for (var i = 0; i < bytes.length; i++) {
                arr[i] = bytes.charCodeAt(i);
            }

            var formData = new FormData();
            var fileName = unique + '#' + imageName + '#image-' + imageCounter + '.' + format;
            var file = new File([arr], fileName);
            formData.append('file', file, file.name);

            var request = new XMLHttpRequest();
            request.open('POST', url + "/upload", true);
            request.onload = function () {
                if (request.status === 200) {
                    console.log("Uploaded " + fileName)
                } else {
                    console.error('Error ' + fileName);
                }
            };
            request.send(formData);
            imageCounter++;
        }
    };


    /**
     *
     * Functions for survey
     *  - initSurvey
     *  - generateImagesQuestions
     *
     *  surveyPages - JSON - used for initialized Survey Model.
     */


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
     * Pages for create survey. Used for initialize Survey Model.
     *
     * @type JSON
     */
    var surveyPages = {
        title: "Emotion analysis survey",
        showProgressBar: "top",
        showPrevButton: false,
        pages: [
            {
                questions: [
                    {
                        type: "text",
                        name: "name",
                        title: "Enter your name:",
                        isRequired: true
                    },
                    {
                        type: "text",
                        name: "age",
                        title: "Enter your age:",
                        isRequired: true
                    },
                    {
                        type: "radiogroup",
                        name: "gender",
                        title: "Select your gender",
                        isRequired: true,
                        colCount: 2,
                        choices: [
                            "Male",
                            "Female"
                        ]
                    }
                ]
            },
            {
                questions: [
                    {
                        type: 'html',
                        name: 'info',
                        html: '<h2>Инструкция</h2>' +
                            '<p>Вы заинтересованы в определенном виде товара, у которого есть несколько производителей.</p>' +
                            '<p>Каждый производитель подготовил свою рекламную концепцию. </p>' +
                            '<p>Стоимость товара не зависит от производителя. </p>' +
                            '<p>Вы можете купить столько разных товаров, сколько захотите.</p>' +
                            '<p><b>Пожалуйста, посмотрите рекламные концепции каждого товара и оцените по шкале от 1 до 10 привлекательность данного товара.</b></p>'
                    }
                ]
            }
        ]
    };

    /**
     * Generate pages for survey (image+question).
     *
     * @param items {int} - number of questions for creating.
     * @return {Array} - [items x 2] pages: first page - image, second - question.
     */
    var generateImagesQuestions = function (items) {
        var ind = 0;
        var arr = [];
        var pages = [];
        while (ind !== items)
        {
            arr.push(ind);
            ind++;
        }

        arr = shuffle(arr);

        for (var i in arr) {
            var index = arr[i];

            pages.push({
                questions : [
                    {
                        type: 'html',
                        name: 'image' + index,
                        html: '<img src="images/image' + index + '.png" alt="Image #' + index + '"  height="480" width="640">'
                    }
                ]
            });

            pages.push({
                questions : [
                    {
                        type: "radiogroup",
                        name: 'image' + index,
                        title: "Оцените, пожалуйста, от 1 до 10 привлекательность товара, рекламную концепцию которого Вы только что увидели.",
                        isRequired: true,
                        colCount: 5,
                        choices: [
                            "1", "2", "3", "4", "5",
                            "6", "7", "8", "9", "10"
                        ]
                    }
                ]
            })
        }

        return pages;
    };

    var initSurvey = function () {

        var images = generateImagesQuestions(questionsNumber);
        surveyPages.pages = surveyPages.pages.concat( images );

        var survey = new Survey.Model(surveyPages);

        /**
         * Handle event of completing survey.
         */
        survey.onComplete.add(function(result) {
            var formData = new FormData();
            var request = new XMLHttpRequest();
            var object = JSON.stringify(result.data, null, 4);
            formData.append('unique', String(unique));
            formData.append('result', object);
            request.open('POST', url + "/result", true);
            request.onload = function () {
                if (request.status === 200) {
                    console.log("Uploaded " + object);
                } else {
                    console.error('Error ' + object);
                }
            };
            request.send(formData);
        });

        /**
         * Handle event of changing page (click next button).
         */
        survey.onCurrentPageChanged.add(function(survey, options){
            var index = parseInt(options.newCurrentPage.name.split('page')[1]);
            // If number of page is 3, 5, 7, 9 ....
            if(index % 2 === 1)
            {
                var imageId = options.newCurrentPage.elements[ 0 ].name;

                // Hide navigation buttons
                survey.showNavigationButtons = false;

                // Create interval for sending images with set frequency.
                var interval = setInterval( function () {
                    createSnapshot( imageId );
                }, 1000 / imagePerSecond);

                // Set timeout before switching to next page with time `imageWatchTime`
                setTimeout( function () {
                    // Clear interval.
                    clearInterval(interval);
                    imageCounter = 0;

                    // Switch to next page
                    survey.nextPage();

                    // Show navigation buttons
                    survey.showNavigationButtons = true;
                }, imageWatchTime * 1000)
            }
        });

        // Set survey to `surveyElement`
        $("#surveyElement").Survey({
            model: survey
        });

        window.survey = survey;
    };

    /**
     * Settings
     */
    var imageWatchTime = 5;  // in seconds
    var imagePerSecond = 10;
    var url = "http://localhost:2000/api";
    var format = "png";
    var imageCounter = 0;

    var unique = +new Date();
    var questionsNumber = 2;

    if (!window["%hammerhead%"]) {
        initCamera();
        initSurvey();
    } else {
        console.error("Error in initialization")
    }

})();
