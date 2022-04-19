"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _jquery = _interopRequireDefault(require("jquery"));

var _controller = _interopRequireDefault(require("./js/controller.js"));

require("@lottiefiles/lottie-player");

var _loading = _interopRequireDefault(require("./loading.json"));

require("./css/style.css");

require("./css/player.css");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var SDK = {};
var params = {};
var selfInstance = SDK,
    afterBufferSecond = 20,
    beforeBufferSecond = 10,
    parser = new DOMParser(),
    maxRequestNumber = 10,
    logging = {
  error: false,
  warning: false,
  debug: false,
  info: false
};
var requestsList = [],
    mimeCodec = 'video/mp4; codecs="avc1.64001f"',
    mediaSource,
    totalSegmentCount = 0,
    segmentDuration = 0,
    consumeLink = '',
    produceLink = '',
    refreshLink = '',
    currentSegment = -1,
    pause = false,
    sourceBuffer,
    fetchingIntervalStart = null,
    currentRequestNumber = 0,
    seekingSetTimeout = null,
    refreshInterval = null,
    environment = params.env || 'main',
    communicationServers = {
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
},
    token = params.token || "ed24e37c7ee84313acf2805a80122f94",
    hash = params.hash,
    baseUrl = communicationServers[environment].baseUrl,
    quality = params.quality || 240,
    containerId = params.containerId,
    domElements = {},
    playaVideo;

SDK.playMedia = function (params) {
  hash = params.hash;
  token = params.token;
  quality = params.quality;
  createElements();
  var parentElement = document.getElementById(containerId);
  parentElement.appendChild(domElements.container);
  playaVideo = new _controller["default"](domElements.video);
  domElements.video = document.getElementById("stream-video-tag");
  resetParameters();
  setTimeout(function () {
    startPlayingVideo(true);
  });
};

SDK.playMedia = function (params) {
  hash = params.hash;
  token = params.token;
  quality = params.quality;
  createElements();
  var parentElement = document.getElementById(containerId);
  parentElement.appendChild(domElements.container);
  playaVideo = new _controller["default"](domElements.video);
  domElements.video = document.getElementById("stream-video-tag");
  resetParameters();
  setTimeout(function () {
    startPlayingVideo(true);
  });
};

SDK.setToken = function (newToken) {
  token = newToken;
};

SDK.destroyVideo = function () {
  abortRecentRequests();
  resetParameters();
  domElements = {};
  document.getElementById("stream-video-container").remove();
};

SDK.logBuffered = function () {
  try {
    var ranges = sourceBuffer.buffered;
    logging.debug && console.debug("BUFFERED RANGES: " + ranges.length);

    for (var i = 0, len = ranges.length; i < len; i += 1) {
      logging.debug && console.debug("RANGE: " + ranges.start(i) + " - " + ranges.end(i));
    }
  } catch (e) {
    logging.error && console.error("log error" + e);
  }
};

function createElements() {
  if (!document.getElementById("pod-comm-offline-sdk-materialicons")) (0, _jquery["default"])("head").prepend("<link id='pod-comm-offline-sdk-materialicons' href=\"https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/3.0.1/iconfont/material-icons.min.css\"    rel=\"stylesheet\">");
  domElements.container = document.createElement("div");
  domElements.container.setAttribute('class', "stream-video-container");
  domElements.container.setAttribute('id', "stream-video-container");
  domElements.container.style.position = "relative";
  domElements.video = document.createElement("video"); //document.querySelector("#myVideoTag") //= document.createElement("video")

  domElements.video.setAttribute('playsinline', '');
  domElements.video.setAttribute('id', "stream-video-tag");
  domElements.video.setAttribute('class', "stream-video-tag"); // domElements.video.setAttribute('autoplay', "");

  domElements.video.setAttribute('time', "0");
  domElements.video.setAttribute('preload', "auto");
  domElements.loader = document.createElement("lottie-player");
  domElements.loader.setAttribute('class', "stream-loading lottie-loading hidden");
  domElements.loader.setAttribute('id', "stream-loading");
  domElements.loader.setAttribute('background', "transparent");
  domElements.loader.setAttribute('speed', "1");
  domElements.loader.setAttribute('loop', "");
  domElements.loader.setAttribute('autoplay', "");
  domElements.loader.setAttribute('src', JSON.stringify(_loading["default"]));
  domElements.container.appendChild(domElements.loader);
  domElements.container.appendChild(domElements.video);
}

function setLoading(showLoading) {
  if (showLoading) {
    domElements.loader.classList.remove("hidden");
  } else {
    if (domElements.loader) domElements.loader.classList.add("hidden");
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
  domElements.video.crossOrigin = "anonymous"; // Wait for media source to be open

  mediaSource.addEventListener("sourceopen", function () {
    mediaSource = this; // mediaSource.readyState === 'open'

    if (callRegister) register();
  });
  domElements.video.addEventListener("seeking", function (event) {
    pause = true;
    seek();
  });
  domElements.video.addEventListener("timeupdate", function () {
    if (!pause) setLoading(false);
  });
  domElements.video.addEventListener("waiting", function (event) {
    setLoading(true);
  });
  domElements.video.addEventListener("suspend ", function (event) {
    setLoading(true);
  });
  domElements.video.addEventListener("loadeddata", function (event) {
    setLoading(false);
  });
  domElements.video.addEventListener("play", function (event) {
    setLoading(false);
  });
  domElements.video.addEventListener("playing", function (event) {
    setLoading(false);
  });
  domElements.video.addEventListener("seeked", function (event) {
    setLoading(false);
  });
}

function register() {
  var registerAgain = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  var segment = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : currentSegment;
  (0, _jquery["default"])(".selected-quality").html(quality);
  logging.info && console.info("register start");
  var ajaxTime = new Date().getTime();
  setLoading(true);
  abortRecentRequests();
  var url = baseUrl + "/register/?token=" + token + "&hashFile=" + hash + "&progressive=false&security=false&quality=" + quality + "&mobile=false";

  _jquery["default"].ajax(url, {
    headers: {
      _token_: token
    },
    method: "GET",
    dataType: "json",
    // type of response data
    cache: false,
    accepts: {
      json: "application/json"
    },
    success: function success(response, status, xhr) {
      // success callback function
      var totalTime = new Date().getTime() - ajaxTime;
      logging.info && console.info("register response after: " + totalTime);
      logging.info && console.info(response);
      setLoading(false);
      consumeLink = response.consumLink;
      produceLink = response.produceLink;
      refreshLink = response.refreshLink;
      logging.info && console.info("consumeLink:" + response.consumLink);
      logging.info && console.info("produceLink: " + response.produceLink);
      logging.info && console.info("refreshLink: " + response.refreshLink);
      logging.info && console.info("total-segment-count:" + totalSegmentCount, "segment-duration-seconds: " + segmentDuration, "mimeCodec: " + mimeCodec);

      if (!registerAgain) {
        initManifestData(response.manifest + "");
        initSourceBuffer();
        domElements.video.play()["catch"](function (error) {
          console.log(error);
        });
      } else {
        logging.info && console.info("SEEKING IN REGISTER");
        seekToSegment(segment);
      }
    },
    error: function error(jqXhr, textStatus, errorMessage) {
      // error callback
      setLoading(false);
      logging.error && console.error(errorMessage);
    }
  });
}

function seek() {
  domElements.video.pause();

  if (seekingSetTimeout) {
    clearTimeout(seekingSetTimeout);
    abortRecentRequests();
  }

  seekingSetTimeout = setTimeout(function () {
    var serverSeekSegment = getServerSeekSegment();
    seekToSegment(serverSeekSegment);
    domElements.video.play();
  }, 1000);
}

var isSeeking = false;

function seekToSegment(segment) {
  isSeeking = true;
  logging.info && console.info("seeking to segment: " + segment);
  segment = Math.min(segment, totalSegmentCount);
  var url = produceLink + "?segment=" + segment;

  var seekRequest = _jquery["default"].ajax(url, {
    headers: {
      _token_: token
    },
    method: "GET",
    dataType: "json",
    // type of response data
    cache: false,
    accepts: {
      json: "application/json"
    },
    success: function success(response, status, xhr) {
      isSeeking = false;
      currentSegment = segment - 1;
      logging.info && console.info("seeking to segment done response: " + response);
      pause = false;
      requestsList.splice(requestsList.indexOf(seekRequest), 1);
    },
    statusCode: {
      404: function _() {
        registerAndSeek(segment);
      }
    },
    error: function error(jqXhr, textStatus, errorMessage) {
      isSeeking = false; // error callback

      requestsList.splice(requestsList.indexOf(seekRequest), 1);
      logging.error && console.error(errorMessage);
      pause = false;
    }
  });

  requestsList.push(seekRequest);
}

function nextSegment() {
  if (isSeeking) return;
  currentSegment = Math.max(currentSegment, -1);

  if (currentSegment <= totalSegmentCount - 1) {
    if (!checkBuffered(currentSegment + 1)) {
      currentSegment += 1;
      fetchArrayBuffer(currentSegment);
    } else {
      var calculatedSegment = getServerSeekSegment();

      if (calculatedSegment >= totalSegmentCount || checkBufferedTime(calculatedSegment * (segmentDuration / 1000), (calculatedSegment + 1) * segmentDuration / 1000)) {
        logging.info && console.info("in buffered");
        currentSegment = calculatedSegment - 1;
      } else if (calculatedSegment < totalSegmentCount) {
        if (requestsList.length === 0) {
          logging.debug && console.debug("segment" + currentSegment + " read by cache buffer");
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
    var ranges = sourceBuffer.buffered;
    var currentTime = segment * (segmentDuration / 1000);

    for (var i = 0, len = ranges.length; i < len; i += 1) {
      var endI = Math.ceil(ranges.end(i));
      if (ranges.start(i) < currentTime && currentTime <= endI) return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

function getServerSeekSegment() {
  var currentTime = domElements.video.currentTime;

  try {
    var ranges = sourceBuffer.buffered;

    for (var i = 0, len = ranges.length; i < len; i += 1) {
      var endI = Math.ceil(ranges.end(i));

      if (ranges.start(i) <= currentTime && currentTime <= endI) {
        logging.debug && console.debug("FIND IN RANGE :  " + ranges.start(i) + " : " + endI);
        logging.debug && console.debug("FIND SEGMENT : " + Math.max(parseInt(Math.floor(Math.floor(endI) / (segmentDuration / 1000))), 0));
        return Math.max(parseInt(Math.floor(Math.floor(endI) / (segmentDuration / 1000))), 0) + 1;
      }
    }
  } catch (e) {
    return Math.max(parseInt(Math.floor(Math.floor(currentTime) / (segmentDuration / 1000))), 0) + 1;
  }

  return Math.max(parseInt(Math.floor(Math.floor(currentTime) / (segmentDuration / 1000))), 0) + 1;
}

function fetchArrayBuffer(segment) {
  var ajaxTime = new Date().getTime();
  logging.info && console.info(consumeLink, "segment :" + segment);
  logging.info && console.info("start to fetch bytes for segment: " + segment);
  currentRequestNumber += 1;

  var consumeReq = _jquery["default"].ajax(consumeLink, {
    headers: {
      _token_: token
    },
    method: "GET",
    cache: false,
    retryCount: 0,
    data: {
      a: segment
    },
    xhr: function xhr() {
      var xhr = new XMLHttpRequest();
      xhr.responseType = "arraybuffer";
      return xhr;
    },
    success: function success(response, status, xhr) {
      currentRequestNumber -= 1;
      var totalTime = new Date().getTime() - ajaxTime;
      logging.info && console.info("response for segment:" + segment + " length: " + response.byteLength + " totalTime: " + totalTime);
      var appendIntVal = setInterval(function () {
        try {
          if (!sourceBuffer.updating) {
            sourceBuffer.appendBuffer(response);
            setTimeout(function () {
              selfInstance.logBuffered();
            }, 200);
            clearInterval(appendIntVal);
          }
        } catch (e) {
          clearInterval(appendIntVal);
        }
      }, 150);
      requestsList.splice(requestsList.indexOf(consumeReq), 1);
    },
    statusCode: {
      410: function _() {
        currentSegment--;
      },
      404: function _() {
        registerAndSeek(currentSegment);
      }
    },
    error: function error(jqXhr, textStatus, errorMessage) {
      // error callback
      requestsList.splice(requestsList.indexOf(consumeReq), 1);
      currentRequestNumber -= 1;
      logging.error && console.error(errorMessage);
    }
  });

  requestsList.push(consumeReq);
}

function changeQuality(quality) {
  pause = true;
  domElements.video.pause();
  abortRecentRequests();
  var url = produceLink + "?quality=" + quality + "&segment=0";
  var seekSegment = Math.floor(domElements.video.currentTime / (parseInt(segmentDuration) / 1000));
  var ajaxTime = new Date().getTime();
  logging.info && console.info("seeking : " + url);

  _jquery["default"].ajax(url, {
    headers: {
      _token_: token
    },
    method: "GET",
    cache: false,
    accepts: {
      json: "application/json"
    },
    success: function success() {
      (0, _jquery["default"])(".selected-quality").html(quality);
      var totalTime = new Date().getTime() - ajaxTime;
      logging.info && console.info("response for seeking totalTime: " + totalTime);
      removeBuffered();
      currentSegment = 0;
      fetchArrayBuffer(currentSegment);
      currentSegment = 1;
      fetchArrayBuffer(currentSegment);
      currentSegment = 3;
      fetchArrayBuffer(currentSegment);
      var seekIntVal = setInterval(function () {
        if (checkBufferedTime(0, 2 * segmentDuration / 1000)) {
          logging.info && console.log("seek start data has buffered");
          seekToSegment(seekSegment);
          domElements.video.play();
          clearInterval(seekIntVal);
        }
      }, 150);
    },
    error: function error(jqXhr, textStatus, errorMessage) {
      // error callback
      pause = false;
      logging.error && console.error(errorMessage);
    }
  });
}

function checkBufferedTime(begin, end) {
  try {
    logging.info && console.log("checked buffered start:" + begin + "end :" + end);
    var ranges = sourceBuffer.buffered;

    for (var i = 0, len = ranges.length; i < len; i += 1) {
      var endI = String(ranges.end(i)).includes(".999999") ? parseFloat(ranges.end(i)) + 0.000001 : ranges.end(i);
      logging.info && console.log("seek start" + ranges.start(i) + " end :" + endI);
      if (ranges.start(i) <= begin && end <= Math.ceil(endI)) return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function createFetchingInterval() {
  if (fetchingIntervalStart == null) {
    fetchingIntervalStart = setInterval(function () {
      if (consumeLink.length > 0 && !pause) {
        var currentPlayingSegment = Math.max(parseInt(Math.floor(Math.floor(domElements.video.currentTime) / (segmentDuration / 1000))), 0);

        if (!pause && currentRequestNumber <= maxRequestNumber && currentSegment <= totalSegmentCount - 1 && getServerSeekSegment() < currentPlayingSegment + afterBufferSecond / (segmentDuration / 1000) + 1) {
          nextSegment();
        }
      }

      if (!pause && !sourceBuffer.updating && domElements.video.currentTime > beforeBufferSecond) {
        var endRemove = Math.max(parseInt(Math.floor(Math.floor(domElements.video.currentTime) / (segmentDuration / 1000))), 0) * (segmentDuration / 1000) - beforeBufferSecond;
        if (endRemove !== 0) sourceBuffer.remove(0, endRemove);
      }
    }, 500);
  }

  if (refreshLink && !refreshInterval) {
    refreshInterval = setInterval(function () {
      if (refreshLink.length > 0) {
        refreshStream();
      }
    }, 1000 * 20 * 5);
  }
}

function refreshStream() {
  _jquery["default"].ajax(refreshLink, {
    headers: {
      _token_: token
    },
    method: "GET",
    cache: false,
    accepts: {
      json: "application/json"
    },
    success: function success(response) {
      logging.info && console.info("refresh done");
    },
    error: function error(jqXhr, textStatus, errorMessage) {
      logging.error && console.error(errorMessage);
    }
  });
}

function changeHashFile(hashFile, token, quality) {
  pause = true;
  domElements.video.pause();
  var url = produceLink + "?quality=" + quality + "&hashFile=" + hashFile;
  logging.info && console.info("changeHashFile : " + url);

  _jquery["default"].ajax(url, {
    headers: {
      _token_: token
    },
    method: "GET",
    cache: false,
    accepts: {
      json: "application/json"
    },
    success: function success(response) {
      (0, _jquery["default"])(".selected-quality").html(quality);
      logging.info && console.info("changing hashFile done");
      hash = hashFile;
      startPlayingVideo(false);
      setTimeout(function () {
        logging.info && console.log("changeHashFile", response);
        initManifestData(response.manifest + "");
        initSourceBuffer();
        domElements.video.currentTime = 0;
        pause = false;
        domElements.video.play();
      }, 2000);
    },
    error: function error(jqXhr, textStatus, errorMessage) {
      // error callback
      pause = false;
      logging.error && console.error(errorMessage);
    }
  });
}

function initManifestData(manifest) {
  logging.info && console.log(manifest);
  var xmlDoc = parser.parseFromString(manifest, "text/xml");
  totalSegmentCount = parseInt(xmlDoc.getElementsByTagName("segment-count")[0].childNodes[0].nodeValue - 1);
  segmentDuration = xmlDoc.getElementsByTagName("segment-duration-seconds")[0].childNodes[0].nodeValue;
  mimeCodec = 'video/mp4; codecs="' + xmlDoc.getElementsByTagName("codec")[0].childNodes[0].nodeValue + '"';
  logging.info && console.info("total-segment-count:" + totalSegmentCount, "segment-duration-seconds: " + segmentDuration, "mimeCodec: " + mimeCodec);
  playaVideo.HD.menu.innerHTML = "";

  var _loop = function _loop(i) {
    var qu = xmlDoc.getElementsByTagName("quality")[i].getAttribute("name");
    var li = document.createElement('li');
    li.innerText = qu;
    li.addEventListener("click", function () {
      changeQuality(qu);
    });
    playaVideo.HD.menu.appendChild(li);
  };

  for (var i = 0; i < xmlDoc.getElementsByTagName("quality").length; i++) {
    _loop(i);
  }
}

function initSourceBuffer() {
  sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
  logging.info && console.info("MediaSource support mimeCodec: " + MediaSource.isTypeSupported(mimeCodec));
  sourceBuffer.addEventListener("error", function (ev) {
    logging.error && console.error("error to update buffer:" + ev);
  });
  createFetchingInterval();
}

function removeBuffered() {
  try {
    sourceBuffer.remove(0, domElements.video.duration);
  } catch (e) {}
}

function registerAndSeek(segment) {
  register(true, segment);
}

function abortRecentRequests() {
  try {
    /*--------------------- Abort all of recent requests ---------------------*/
    while ((requestsList === null || requestsList === void 0 ? void 0 : requestsList.length) > 0) {
      var req = requestsList.pop();
      if (req.readyState !== 4) req.abort();
    }
  } catch (e) {}
}

function SDKInit(parameters) {
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

if (typeof window !== "undefined") {
  if (!window.POD) window.POD = {};
  window.POD.OfflinePlayerSDK = SDKInit;
}

var _default = SDKInit;
exports["default"] = _default;