// application/option/video-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);

class VideoOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setPosterFrameSeconds(value) {
    this.posterFrameSeconds = value;
    return this;
  }

  getPosterFrameSeconds() {
    return this.posterFrameSeconds;
  }
}

module.exports = VideoOption;
