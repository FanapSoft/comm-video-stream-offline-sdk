"use strict";

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var prefix = ['', 'moz', 'webkit', 'ms'].find(function (p) {
  return !p ? 'fullscreenElement' in document : p + 'FullScreenElement' in document;
});
var fullScreen = {
  state: function state(elem) {
    return document[prefix ? prefix + 'FullScreenElement' : 'fullscreenElement'] === elem;
  },
  request: function request(elem) {
    return elem[prefix ? prefix + 'RequestFullscreen' : 'requestFullscreen']();
  },
  toggle: function toggle(elem) {
    return fullScreen.state(elem) ? fullScreen.exit(elem) : fullScreen.request(elem);
  },
  exit: function exit(elem) {
    return document[prefix ? prefix + 'ExitFullscreen' : 'exitFullscreen']();
  }
};

var timeCalc = function timeCalc(time) {
  var seconds = Math.floor(time);
  return seconds < 10 ? "0:0" + seconds : seconds < 60 ? '0:' + seconds : seconds === 60 ? "1:00" : Math.floor(seconds / 60) + ":" + (seconds % 60 < 10 ? "0" : "") + +seconds % 60;
};

var Playa = /*#__PURE__*/_createClass(function Playa(elem) {
  _classCallCheck(this, Playa);

  return new defaultPlayer(elem);
});

var defaultPlayer = /*#__PURE__*/function () {
  function defaultPlayer(video) {
    var _this = this;

    _classCallCheck(this, defaultPlayer);

    var video_old = video;
    this.video = video_old.cloneNode(true);

    if (this.video.preload === "none" || this.video.getAttribute("preload") === null) {
      this.video.preload = "metadata";
    } // create wrappers and controls


    this.controls = {};
    this.timer = {};
    this.timer.flag = this._createElement("div", {
      className: "timer-flag"
    });
    this.timer.counter = this._createElement("span", {
      className: "counter"
    });
    this.track = {};
    this.track.loadedbar = this._createElement("canvas", {
      className: "track-loader-bar"
    });
    this.track.picker = this._createElement("span", {});
    this.track.circle = this._createElement("span", {
      className: "track-circle"
    });
    this.track.bar = this._createElement("div", {
      className: "track-bar"
    }, [this.track.picker, this.track.circle]);
    this.track.inner = this._createElement("div", {
      className: "track-inner"
    }, [this.track.loadedbar, this.track.bar, this.timer.flag]);
    this.track.track = this._createElement("div", {
      className: "track"
    }, [this.track.inner]);
    this.volume = {};
    this.volume.muteButton = this._createElement("i", {
      className: "mute-button icon"
    });
    this.volume.button = this._createElement("input", {
      className: "volume-button",
      type: "range"
    });
    this.volume.container = this._createElement("span", {
      className: "volume-container"
    }, [this.volume.button, this.volume.muteButton]);
    this.fullscreenButton = this._createElement("i", {
      className: "fullscreen-button icon"
    });
    this.skipToTime = video.getAttribute('time') || video.getAttribute('date-time');
    this.HD = {};
    this.HD.button = this._createElement("i", {
      className: "hd-button icon"
    });
    this.HD.menu = this._createElement("ul", {
      className: "hd-menu"
    });
    this.HD.selectedQuality = this._createElement("span", {
      className: "selected-quality"
    });
    this.HD.wrapper = this._createElement("div", {
      className: "hd-wrapper"
    }, [this.HD.button, this.HD.menu, this.HD.selectedQuality]);
    this.playPauseButton = this._createElement("i", {
      className: "play-button icon"
    });
    this.ct = this._createElement("div", {
      className: "button-bar"
    }, [this.timer.counter, this.HD.wrapper, this.playPauseButton, this.volume.container, this.fullscreenButton]);
    this.controls.bottomtray = this._createElement("div", {
      className: "controls-bottom-tray"
    }, [this.track.track, this.ct]);
    this.controls.wrapper = this._createElement("div", {
      className: "controls-wrapper invisible"
    }, [this.controls.bottomtray]);
    this.wrapper = this._createElement("div", {
      className: "responsive-video"
    }, [this.video, this.controls.wrapper]);

    var addDisableClass = this._debounce(function () {
      _this.controls.wrapper.classList.add("disable");
    });

    this.lastWatchTime = null;
    video_old.parentNode.replaceChild(this.wrapper, video_old);

    if (this.video.autoplay) {
      this.playToggle();
    }

    document.addEventListener("keydown", function (evt) {
      if (document.activeElement === _this.video && evt.which === 32) {
        evt.preventDefault();

        _this.playToggle();
      }
    });
    this.controls.wrapper.addEventListener("mousemove", function (evt) {
      _this.controls.wrapper.classList.remove("disable");

      if (fullScreen.state(_this.wrapper)) addDisableClass();
    });
    this.video.setAttribute("tabindex", 0);
    this.video.addEventListener("loadeddata", function (evt) {
      var ratio = _this.video.videoHeight / _this.video.videoWidth;

      _this.wrapper.classList.add("loaded");

      _this.wrapper.style.paddingTop = ratio * 100 + "%";

      _this.controls.wrapper.classList.remove("invisible");

      _this.timer.counter.innerHTML = timeCalc(0) + "/" + timeCalc(_this.video.duration);

      if (_this.skipToTime) {
        _this.video.currentTime = _this.skipToTime;
        _this.track.bar.style.width = _this.skipToTime / _this.video.duration * 100 + "%";
        _this.track.circle.style.left = _this.track.bar.style.width;
      }

      if (_this.lastWatchTime) {
        _this.video.currentTime = _this.lastWatchTime;
        _this.track.bar.style.width = _this.lastWatchTime / _this.video.duration * 100 + "%";
        _this.track.circle.style.left = _this.track.bar.style.width;
        _this.lastWatchTime = null;

        _this.video.play();
      } // todo check video sources
      // let videoSources = this.video.querySelectorAll('source[src$="'+this.video.currentSrc.split(".").pop()+'"]');
      // if (videoSources.length) {
      //     let currentVideoSource = this.video.querySelector('source[src="'+this.video.currentSrc+'"]');
      //     this.wrapper.style.setProperty('--quality', currentVideoSource.getAttribute("size"));
      //
      //     this.HD.menu.innerHTML = "";
      //     videoSources.forEach((source) => {
      //         let li = document.createElement('li');
      //         li.innerText = source.getAttribute("size");
      //         li.addEventListener("click", () => {
      //             this.lastWatchTime = this.video.currentTime;
      //             this.video.setAttribute("src", source.getAttribute("src"));
      //             //this.wrapper.style.setProperty('--quality', source.getAttribute("size"));
      //         });
      //         this.HD.menu.appendChild(li);
      //     });
      // }
      // todo check textTrack
      // const textTrack = Array.from(this.video.textTracks).find((track) => track.mode === "showing");
      // if (textTrack) {
      //     console.log(textTrack, textTrack.cues)
      //     //textTrack.mode = 'hidden';
      //     textTrack.oncuechange = function(e) { console.log("pp")
      //         var cue = this.activeCues[0];
      //         if (cue) {
      //             //span.innerHTML = '';
      //             //span.appendChild(cue.getCueAsHTML());
      //             console.log(cue.getCueAsHTML());
      //         }
      //     }
      // }

    });
    this.track.inner.addEventListener("mousemove", function (evt) {
      var seek = evt.offsetX / _this.track.inner.clientWidth * _this.video.duration;
      _this.timer.flag.innerHTML = timeCalc(seek);
      _this.timer.flag.style.left = evt.offsetX + "px";
      _this.track.picker.style.left = evt.offsetX + "px";
    });
    this.track.picker.addEventListener("mousemove", function (evt) {
      evt.stopPropagation();
    });
    this.track.picker.addEventListener("click", function (evt) {
      evt.stopPropagation();

      var percentage = parseInt(_this.track.picker.style.left.replace("px", "")) / _this.track.inner.clientWidth;

      var seek = percentage * _this.video.duration;
      _this.track.bar.style.width = 100 * percentage + "%";
      _this.track.circle.style.left = _this.track.bar.style.width;
      _this.timer.counter.innerHTML = timeCalc(seek) + "/" + timeCalc(_this.video.duration);
      _this.video.currentTime = seek;
    });
    this.playPauseButton.addEventListener("click", function () {
      _this.playToggle();
    });
    this.video.addEventListener("progress", function () {
      if (_this.video.duration) {
        _this._drawProgress(_this.track.loadedbar, _this.video.buffered, _this.video.duration);
      }
    });
    this.video.addEventListener("timeupdate", function () {
      return _this._timerWatch();
    });
    this.video.addEventListener("play", function () {
      _this.video.classList.add("playing");
    });
    this.video.addEventListener("pause", function () {
      _this.video.classList.remove("playing");
    });
    this.video.addEventListener("ended", function () {
      _this.track.bar.style.width = "100%";
      _this.track.circle.style.left = _this.track.bar.style.width;
      _this.timer.counter.innerHTML = parseFloat(_this.video.duration);
    });
    this.track.inner.addEventListener("click", function (evt) {
      var percentage = evt.offsetX / _this.track.inner.clientWidth;
      var seek = percentage * _this.video.duration;
      _this.track.bar.style.width = 100 * percentage + "%";
      _this.track.circle.style.left = _this.track.bar.style.width;
      _this.timer.counter.innerHTML = timeCalc(seek) + "/" + timeCalc(_this.video.duration);
      _this.video.currentTime = seek;
    });
    this.fullscreenButton.addEventListener("click", function (evt) {
      evt.stopPropagation();

      if (fullScreen.state(_this.wrapper)) {
        _this.fullscreenButton.classList.remove("active");
      } else {
        _this.fullscreenButton.classList.add("active");
      }

      fullScreen.toggle(_this.wrapper);
    });
    this.volume.muteButton.addEventListener("click", function () {
      _this.video.muted = !_this.video.muted;

      if (_this.video.muted) {
        _this.volume.muteButton.setAttribute("active", "");
      } else {
        _this.volume.muteButton.removeAttribute("active");
      }
    });
    this.volume.button.addEventListener("input", function () {
      _this.video.volume = _this.volume.button.value / 100;

      _this.wrapper.style.setProperty('--volume', _this.value + "%");
    });
    this.HD.button.addEventListener("click", function () {
      _this.HD.wrapper.classList.toggle("active");
    });
    this.HD.button.addEventListener("mousemove", function () {
      _this.HD.wrapper.classList.add("active");
    });
    this.HD.menu.addEventListener("mouseleave", function () {
      _this.HD.wrapper.classList.remove("active");
    });
    this.HD.wrapper.addEventListener("mouseleave", function () {
      _this.HD.wrapper.classList.remove("active");
    });
    this.HD.wrapper.addEventListener("mouseenter", function () {
      _this.HD.wrapper.classList.add("active");
    });
    this.controls.wrapper.addEventListener("click", function (evt) {
      _this.playToggle();
    });
    this.controls.bottomtray.addEventListener("click", function (evt) {
      evt.stopPropagation();
    });
    this.video.volume = .5;
    this.volume.button.value = 50;
    this.wrapper.style.setProperty('--volume', "50%");
  }

  _createClass(defaultPlayer, [{
    key: "_timerWatch",
    value: function _timerWatch() {
      if (!this.video.paused) {
        var percentage = this.video.currentTime / this.video.duration * 100;
        this.video.parentNode.querySelector(".track-bar").style.width = percentage + "%";
        this.video.parentNode.querySelector(".track-circle").style.left = this.video.parentNode.querySelector(".track-bar").style.width;
        this.video.parentNode.querySelector(".counter").innerHTML = timeCalc(this.video.currentTime) + "/" + timeCalc(this.video.duration);
      }
    }
  }, {
    key: "_createElement",
    value: function _createElement(tag, attrs, content) {
      var el = document.createElement(tag);

      if (attrs) {
        Object.keys(attrs).forEach(function (attr) {
          return el.setAttribute(attr === "className" ? "class" : attr, attrs[attr]);
        });
      }

      if (content) {
        if (Array.isArray(content)) {
          content.forEach(function (item) {
            return el.appendChild(item);
          });
        } else {
          el.innerHTML = content;
        }
      }

      return el;
    }
  }, {
    key: "_debounce",
    value: function _debounce(func) {
      var _this2 = this;

      var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2000;
      var timer;
      return function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        clearTimeout(timer);
        timer = setTimeout(function () {
          func.apply(_this2, args);
        }, timeout);
      };
    }
  }, {
    key: "_drawProgress",
    value: function _drawProgress(canvas, buffered, duration) {
      var context = canvas.getContext('2d', {
        antialias: false
      });
      context.fillStyle = '#F464534C';
      var width = canvas.width;
      var height = canvas.height;
      if (!width || !height) throw "Canvas's width or height weren't set!";
      context.clearRect(0, 0, width, height); // clear canvas

      for (var i = 0; i < buffered.length; i++) {
        var leadingEdge = buffered.start(i) / duration * width;
        var trailingEdge = buffered.end(i) / duration * width;
        context.fillRect(leadingEdge, 0, trailingEdge - leadingEdge, height);
      }
    }
  }, {
    key: "playToggle",
    value: function playToggle() {
      if (this.video.paused) {
        this.video.classList.add("playing");
        this.video.play();

        if (this.video.preload !== "auto") {
          this.video.preload = "auto";
        }

        this.video.focus();
      } else {
        this.video.classList.remove("playing");
        this.video.pause();
      }
    }
  }]);

  return defaultPlayer;
}();

if (typeof module !== 'undefined') {
  module.exports = Playa;
}

window.Playa = Playa;