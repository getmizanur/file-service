// application/option/content-defaults-option.js
const AbstractOption = require(
  global.applicationPath('/library/core/common/abstract-option')
);
const ThumbnailOption = require('./thumbnail-option');
const VideoOption = require('./video-option');

class ContentDefaultsOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }

  setThumbnail(options) {
    this.thumbnail = new ThumbnailOption(options);
    return this;
  }

  getThumbnail() {
    return this.thumbnail;
  }

  setVideo(options) {
    this.video = new VideoOption(options);
    return this;
  }

  getVideo() {
    return this.video;
  }
}

module.exports = ContentDefaultsOption;
