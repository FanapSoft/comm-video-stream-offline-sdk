import jquery from 'jquery'
import playaController from './js/controller.js'
import '@lottiefiles/lottie-player'
import loadingJSON from './loading.json'
import "./css/style.css"
import "./css/player.css"

const SDK = {};
let params = {}

const
    selfInstance = SDK
    , afterBufferSecond = 20
    , beforeBufferSecond = 10
    , parser = new DOMParser()
    , maxRequestNumber = 10
    , logging = {
        error: false,
        warning: false,
        debug: false,
        info: false
    }

let
    requestsList = []
    , mimeCodec = 'video/mp4; codecs="avc1.64001f"'
    , mediaSource
    , totalSegmentCount = 0
    , segmentDuration = 0
    , consumeLink = ''
    , produceLink = ''
    , refreshLink = ''
    , currentSegment = -1
    , pause = false
    , sourceBuffer
    , fetchingIntervalStart = null
    , currentRequestNumber = 0
    , seekingSetTimeout = null
    , refreshInterval = null

    , environment = params.env || 'main'
    , communicationServers = {
        // Main Server
        main: {
            baseUrl: "https://offline-stream.pod.ir"
        },
        // Sand Box Server
        sandbox: {
            baseUrl: "https://sandbox-offline-stream.pod.ir"
        },
        // Integration Server
        integration: {
            baseUrl: "http://192.168.112.32"
        }
    }
    , token = params.token || "ed24e37c7ee84313acf2805a80122f94"
    , hash = params.hash
    , baseUrl = communicationServers[environment].baseUrl
    , quality = params.quality || 240
    , containerId = params.containerId
    , domElements = {}
    , playaVideo
    , isSeeking = false;

SDK.playMedia = function (params) {
    hash = params.hash;
    token = params.token;
    quality = params.quality;
    createElements();
    const parentElement = document.getElementById(containerId);
    parentElement.appendChild(domElements.container);
    playaVideo = new playaController(domElements.video);
    domElements.video = document.getElementById("stream-video-tag")
    resetParameters();
    setTimeout(function () {
        startPlayingVideo(true);
    })
};

SDK.playMedia = function (params) {
    hash = params.hash;
    token = params.token;
    quality = params.quality;
    createElements();
    const parentElement = document.getElementById(containerId);
    parentElement.appendChild(domElements.container);
    playaVideo = new playaController(domElements.video);
    domElements.video = document.getElementById("stream-video-tag")
    resetParameters();
    setTimeout(function () {
        startPlayingVideo(true);
    })
};

SDK.setToken = function (newToken) {
    token = newToken
};

SDK.destroyVideo = function () {
    abortRecentRequests();
    resetParameters();
    domElements = {};
    document.getElementById("stream-video-container").remove()
}

SDK.logBuffered = function () {
    try {
        let ranges = sourceBuffer.buffered;
        logging.debug && console.debug("[SDK] BUFFERED RANGES: " + ranges.length);
        for (let i = 0, len = ranges.length; i < len; i += 1) {
            logging.debug && console.debug("[SDK] RANGE: " + ranges.start(i) + " - " + ranges.end(i));
        }
    } catch (e) {
        logging.error && console.error("[SDK] log error" + e)
    }
}

function createElements() {
    if (!document.getElementById("pod-comm-offline-sdk-materialicons"))
        jquery("head").prepend("<link id='pod-comm-offline-sdk-materialicons' href=\"https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/3.0.1/iconfont/material-icons.min.css\"    rel=\"stylesheet\">")

    domElements.container = document.createElement("div");
    domElements.container.setAttribute('class', "stream-video-container");
    domElements.container.setAttribute('id', "stream-video-container");
    domElements.container.style.position = "relative";

    domElements.video = document.createElement("video")
    domElements.video.setAttribute('playsinline', '');
    domElements.video.setAttribute('id', "stream-video-tag");
    domElements.video.setAttribute('class', "stream-video-tag");
    domElements.video.setAttribute('time', "0");
    domElements.video.setAttribute('preload', "auto");
    domElements.video.style.width = '100%';

    domElements.loader = document.createElement("lottie-player");
    domElements.loader.setAttribute('class', "stream-loading lottie-loading hidden");
    domElements.loader.setAttribute('id', "stream-loading");
    domElements.loader.setAttribute('background', "transparent");
    domElements.loader.setAttribute('speed', "1");
    domElements.loader.setAttribute('loop', "");
    domElements.loader.setAttribute('autoplay', "");

    domElements.loader.setAttribute('src', JSON.stringify(loadingJSON));

    domElements.container.appendChild(domElements.loader);
    domElements.container.appendChild(domElements.video);
}

function setLoading(showLoading) {
    if (showLoading) {
        domElements.loader.classList.remove("hidden");
    } else {
        if (domElements.loader)
            domElements.loader.classList.add("hidden");
    }
}

function resetParameters() {
    currentRequestNumber = 0;
    totalSegmentCount = 0;
    segmentDuration = 0;
    consumeLink = "";
    produceLink = "";
    refreshLink = null;
    currentSegment = -1;
    pause = false;
    if (fetchingIntervalStart != null) {
        clearInterval(fetchingIntervalStart);
        fetchingIntervalStart = null;
    }
    if (seekingSetTimeout != null) {
        clearTimeout(seekingSetTimeout);
        seekingSetTimeout = null;
    }
    if (refreshInterval != null) {
        clearTimeout(refreshInterval);
        refreshInterval = null;
    }
}

function startPlayingVideo(callRegister) {
    // Create Media Source
    mediaSource = new MediaSource(); // mediaSource.readyState === 'closed'
    // Attach media source to video element
    domElements.video.src = URL.createObjectURL(mediaSource);

    domElements.video.crossOrigin = "anonymous";
    // Wait for media source to be open
    mediaSource.addEventListener("sourceopen", function () {
        mediaSource = this; // mediaSource.readyState === 'open'
        if (callRegister)
            register();
    });

    domElements.video.addEventListener("seeking", (event) => {
        pause = true;
        seek();
    });

    domElements.video.addEventListener("timeupdate", () => {
        if (!pause) setLoading(false);
    });

    domElements.video.addEventListener("waiting", (event) => {
        setLoading(true);
    });
    domElements.video.addEventListener("suspend ", (event) => {
        setLoading(true);
    });
    domElements.video.addEventListener("loadeddata", (event) => {
        setLoading(false);
    });
    domElements.video.addEventListener("play", (event) => {
        setLoading(false);
    });
    domElements.video.addEventListener("playing", (event) => {
        setLoading(false);
    });
    domElements.video.addEventListener("seeked", (event) => {
        setLoading(false);
    });
}

function register(registerAgain = false, segment = currentSegment) {
    jquery(".selected-quality").html(quality)
    logging.info && console.info("[SDK] register start");
    const ajaxTime = new Date().getTime();
    setLoading(true);
    abortRecentRequests();
    const url =
        baseUrl +
        "/register/?token=" +
        token +
        "&hashFile=" +
        hash +
        "&progressive=false&security=false&quality=" +
        quality +
        "&mobile=false";
    jquery.ajax(url, {
        headers: {
            _token_: token
        },
        method: "GET",
        dataType: "json", // type of response data
        cache: false,
        accepts: {
            json: "application/json",
        },
        success: function (response, status, xhr) {
            // success callback function
            const totalTime = new Date().getTime() - ajaxTime;
            logging.info && console.info("[SDK] register response after: " + totalTime);
            logging.info && console.info(response);
            setLoading(false);

            consumeLink = response.consumLink;
            produceLink = response.produceLink;
            refreshLink = response.refreshLink;
            logging.info && console.info("[SDK] consumeLink:" + response.consumLink);
            logging.info && console.info("[SDK] produceLink: " + response.produceLink);
            logging.info && console.info("[SDK] refreshLink: " + response.refreshLink);
            logging.info && console.info(
                "total-segment-count:" + totalSegmentCount,
                "segment-duration-seconds: " + segmentDuration,
                "mimeCodec: " + mimeCodec
            );

            if (!registerAgain) {
                initManifestData(response.manifest + "")
                initSourceBuffer();

                domElements.video.play().catch(error => {
                    console.log(error)
                });


            } else {
                logging.info && console.info("[SDK] SEEKING IN REGISTER")
                seekToSegment(segment);
            }
        },
        error: function (jqXhr, textStatus, errorMessage) {
            // error callback
            setLoading(false);
            logging.error && console.error(errorMessage);
        },
    });
}

function seek() {
    domElements.video.pause();
    if (seekingSetTimeout) {
        clearTimeout(seekingSetTimeout);
        abortRecentRequests();
    }
    seekingSetTimeout = setTimeout( function () {
        const serverSeekSegment = getServerSeekSegment();
        seekToSegment(serverSeekSegment);
        domElements.video.play();
    }, 1500);
}

function seekToSegment(segment) {
    isSeeking = true;
    logging.info && console.info("[SDK] seeking to segment: " + segment);
    segment = Math.min(segment, totalSegmentCount)
    const url = produceLink + "?segment=" + segment;
    const seekRequest = jquery.ajax(url, {
        headers: {
            _token_: token,
        },
        method: "GET",
        dataType: "json", // type of response data
        cache: false,
        accepts: {
            json: "application/json",
        },
        success: function (response, status, xhr) {
            isSeeking = false;
            currentSegment = segment - 1;
            logging.info && console.info("[SDK] seeking to segment done response: " + response);
            pause = false;
            requestsList.splice(requestsList.indexOf(seekRequest), 1);
        },
        statusCode: {
            404: function () {
                registerAndSeek(segment);
            },
        },
        error: function (jqXhr, textStatus, errorMessage) {
            isSeeking = false;
            // error callback
            requestsList.splice(requestsList.indexOf(seekRequest), 1);
            logging.error && console.error(errorMessage);
            pause = false;
        }
    });
    requestsList.push(seekRequest);
}

function nextSegment() {
    if(isSeeking)
        return;

    currentSegment = Math.max(currentSegment, -1);
    if (currentSegment <= totalSegmentCount - 1) {
        if (!checkBuffered(currentSegment + 1)) {
            currentSegment += 1;
            fetchArrayBuffer(currentSegment);
        } else {
            const calculatedSegment = getServerSeekSegment();
            if (calculatedSegment >= totalSegmentCount || checkBufferedTime(calculatedSegment * (segmentDuration / 1000), (calculatedSegment + 1) * segmentDuration / 1000)) {
                logging.info && console.info("[SDK] in buffered")
                currentSegment = calculatedSegment - 1;
            } else if (calculatedSegment < totalSegmentCount) {
                if (requestsList.length === 0) {
                    logging.debug && console.debug("[SDK] segment" + currentSegment + " read by cache buffer");
                    pause = true;
                     abortRecentRequests();
                     seekToSegment(calculatedSegment);
                }
            }
        }
    }
}

function checkBuffered(segment) {
    try {
        const ranges = sourceBuffer.buffered;
        const currentTime = segment * (segmentDuration / 1000);
        for (let i = 0, len = ranges.length; i < len; i += 1) {
            const endI = Math.ceil(ranges.end(i));
            if (ranges.start(i) < currentTime && currentTime <= endI) return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

function getServerSeekSegment() {
    let currentTime = domElements.video.currentTime;
    try {
        let ranges = sourceBuffer.buffered;
        for (let i = 0, len = ranges.length; i < len; i += 1) {
            const endI = Math.ceil(ranges.end(i));
            if (ranges.start(i) <= currentTime && currentTime <= endI) {
                logging.debug && console.debug("[SDK] FIND IN RANGE :  " + ranges.start(i) + " : " + endI)
                logging.debug && console.debug("[SDK] FIND SEGMENT : " + Math.max(parseInt(Math.floor(Math.floor(endI) / (segmentDuration / 1000))), 0))
                return Math.max(parseInt(Math.floor(Math.floor(endI) / (segmentDuration / 1000))), 0) + 1;
            }
        }
    } catch (e) {
        return Math.max(
            parseInt(Math.floor(Math.floor(currentTime) / (segmentDuration / 1000))),
            0) + 1;
    }
    return Math.max(
        parseInt(Math.floor(Math.floor(currentTime) / (segmentDuration / 1000))),
        0) + 1;
}

function fetchArrayBuffer(segment) {
    const ajaxTime = new Date().getTime();
    logging.info && console.info(consumeLink, "segment :" + segment);
    logging.info && console.info("[SDK] start to fetch bytes for segment: " + segment);
    currentRequestNumber += 1;
    const consumeReq = jquery.ajax(consumeLink, {
        headers: {
            _token_: token,
        },
        method: "GET",
        cache: false,
        retryCount: 0,
        data: {a: segment},
        xhr: function () {
            const xhr = new XMLHttpRequest();
            xhr.responseType = "arraybuffer";
            return xhr;
        },
        success: function (response, status, xhr) {
            currentRequestNumber -= 1;
            const totalTime = new Date().getTime() - ajaxTime;
            logging.info && console.info(
                "response for segment:" +
                segment +
                " length: " +
                response.byteLength +
                " totalTime: " +
                totalTime
            );
            const appendIntVal = setInterval(() => {
                try {
                    if (!sourceBuffer.updating) {
                        sourceBuffer.appendBuffer(response);
                        setTimeout(function () {
                            selfInstance.logBuffered();
                        }, 200)
                        clearInterval(appendIntVal);
                    }
                } catch (e) {
                    clearInterval(appendIntVal);
                }
            }, 150);
            requestsList.splice(requestsList.indexOf(consumeReq), 1);
        },
        statusCode: {
            410: function () {
                currentSegment--;
            },
            404: function () {
                registerAndSeek(currentSegment);
            },
        },
        error: function (jqXhr, textStatus, errorMessage) {
            // error callback
            requestsList.splice(requestsList.indexOf(consumeReq), 1);
            currentRequestNumber -= 1;
            logging.error && console.error(errorMessage);
        },
    });

    requestsList.push(consumeReq);
}

function changeQuality(quality) {
    pause = true;
    domElements.video.pause();
    abortRecentRequests();
    const url = produceLink + "?quality=" + quality + "&segment=0";
    const seekSegment = Math.floor(domElements.video.currentTime / (parseInt(segmentDuration) / 1000));
    const ajaxTime = new Date().getTime();
    logging.info && console.info("[SDK] seeking : " + url);
    jquery.ajax(url, {
        headers: {
            _token_: token,
        },
        method: "GET",
        cache: false,
        accepts: {
            json: "application/json",
        },
        success: function () {
            jquery(".selected-quality").html(quality)
            const totalTime = new Date().getTime() - ajaxTime;
            logging.info && console.info("[SDK] response for seeking totalTime: " + totalTime);
            removeBuffered();
            currentSegment = 0;
            fetchArrayBuffer(currentSegment);
            currentSegment = 1;
            fetchArrayBuffer(currentSegment);
            currentSegment = 3;
            fetchArrayBuffer(currentSegment);

            const seekIntVal = setInterval(() => {
                if (checkBufferedTime(0, 2 * segmentDuration / 1000)) {
                    logging.info && console.log("[SDK] seek start data has buffered")
                    seekToSegment(seekSegment);
                    domElements.video.play();
                    clearInterval(seekIntVal);
                }
            }, 150);
        },
        error: function (jqXhr, textStatus, errorMessage) {
            // error callback
            pause = false;
            logging.error && console.error(errorMessage);
        },
    });
}

function checkBufferedTime(begin, end) {
    try {
        logging.info && console.log("[SDK] checked buffered start:" + begin + "end :" + end)
        const ranges = sourceBuffer.buffered;
        for (let i = 0, len = ranges.length; i < len; i += 1) {
            const endI = String(ranges.end(i)).includes(".999999")
                ? parseFloat(ranges.end(i)) + 0.000001
                : ranges.end(i);
            logging.info && console.log("[SDK] seek start" + ranges.start(i) + " end :" + endI)
            if (ranges.start(i) <= begin && end <= Math.ceil(endI)) return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

function createFetchingInterval() {
    if (fetchingIntervalStart == null) {
        fetchingIntervalStart = setInterval(() => {
            if (consumeLink.length > 0 && !pause) {
                const currentPlayingSegment = Math.max(parseInt(Math.floor(Math.floor(domElements.video.currentTime) / (segmentDuration / 1000))), 0);
                if (!pause && currentRequestNumber <= maxRequestNumber
                    && currentSegment <= totalSegmentCount - 1
                    && getServerSeekSegment() < currentPlayingSegment + afterBufferSecond / (segmentDuration / 1000) + 1) {
                    nextSegment();
                }
            }
            if (!pause && !sourceBuffer.updating && domElements.video.currentTime > beforeBufferSecond) {
                const endRemove = Math.max(parseInt(Math.floor(Math.floor(domElements.video.currentTime) / (segmentDuration / 1000))), 0) * (segmentDuration / 1000) - beforeBufferSecond;
                if (endRemove !== 0)
                    sourceBuffer.remove(0, endRemove);
            }
        }, 500);
    }
    if (refreshLink && !refreshInterval) {
        refreshInterval = setInterval(() => {
            if (refreshLink.length > 0) {
                refreshStream()
            }
        }, 1000 * 20 * 5);
    }
}

function refreshStream() {
    jquery.ajax(refreshLink, {
        headers: {
            _token_: token,
        },
        method: "GET",
        cache: false,
        accepts: {
            json: "application/json",
        },
        success: function (response) {
            logging.info && console.info("[SDK] refresh done");
        },
        error: function (jqXhr, textStatus, errorMessage) {
            logging.error && console.error(errorMessage);
        },
    });
}

function changeHashFile(hashFile, token, quality) {
    pause = true;
    domElements.video.pause();
    const url = produceLink + "?quality=" + quality + "&hashFile=" + hashFile;
    logging.info && console.info("[SDK] changeHashFile : " + url);
    jquery.ajax(url, {
        headers: {
            _token_: token,
        },
        method: "GET",
        cache: false,
        accepts: {
            json: "application/json",
        },
        success: function (response) {
            jquery(".selected-quality").html(quality)
            logging.info && console.info("[SDK] changing hashFile done");
            hash = hashFile;
            startPlayingVideo(false)
            setTimeout(function () {
                logging.info && console.log("[SDK] changeHashFile", response)
                initManifestData(response.manifest + "")
                initSourceBuffer();
                domElements.video.currentTime = 0;
                pause = false;
                domElements.video.play()
            }, 2000)
        },
        error: function (jqXhr, textStatus, errorMessage) {
            // error callback
            pause = false;
            logging.error && console.error(errorMessage);
        },
    });
}

function initManifestData(manifest) {
    logging.info && console.log(manifest)
    const xmlDoc = parser.parseFromString(manifest, "text/xml");
    totalSegmentCount = parseInt(
        xmlDoc.getElementsByTagName("segment-count")[0].childNodes[0].nodeValue - 1
    );
    segmentDuration = xmlDoc.getElementsByTagName("segment-duration-seconds")[0]
        .childNodes[0].nodeValue;
    mimeCodec =
        'video/mp4; codecs="' +
        xmlDoc.getElementsByTagName("codec")[0].childNodes[0].nodeValue +
        '"';
    logging.info && console.info(
        "total-segment-count:" + totalSegmentCount,
        "segment-duration-seconds: " + segmentDuration,
        "mimeCodec: " + mimeCodec
    );


    playaVideo.HD.menu.innerHTML = "";

    for (let i = 0; i < xmlDoc.getElementsByTagName("quality").length; i++) {
        const qu = xmlDoc.getElementsByTagName("quality")[i].getAttribute("name");
        let li = document.createElement('li');
        li.innerText = qu;
        li.addEventListener("click", () => {
            changeQuality(qu);
        });
        playaVideo.HD.menu.appendChild(li);
    }
}

function initSourceBuffer() {
    sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    logging.info && console.info("[SDK] MediaSource support mimeCodec: " + MediaSource.isTypeSupported(mimeCodec));
    sourceBuffer.addEventListener("error", function (ev) {
        logging.error && console.error("[SDK] error to update buffer:" + ev);
    });

    createFetchingInterval()
}

function removeBuffered() {
    try {
        sourceBuffer.remove(0, domElements.video.duration);
    } catch (e) {

    }
}

function registerAndSeek(segment) {
    register(true, segment);
}

function abortRecentRequests() {
    try {
        /*--------------------- Abort all of recent requests ---------------------*/
        while (requestsList?.length > 0) {
            const req = requestsList.pop();
            if (req.readyState !== 4) req.abort();
        }
    } catch (e) {

    }
}

function  SDKInit(parameters) {
    params = parameters;

    if (params.logging) {
        logging.error = !!params.logging.error;
        logging.warning = !!params.logging.warning;
        logging.debug = !!params.logging.debug;

        logging.info = !!params.logging.info;
    }

    environment = params.env || 'main';
    token = params.token || "ed24e37c7ee84313acf2805a80122f94";
    hash = params.hash;
    baseUrl = communicationServers[environment].baseUrl;
    quality = params.quality || 240;
    containerId = params.containerId;

    createElements();

    return SDK;
}

if(typeof window !== "undefined") {
    if(!window.POD)
        window.POD = {};
    window.POD.OfflinePlayerSDK = SDKInit
}

export default SDKInit;
