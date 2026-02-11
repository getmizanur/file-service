const Element = require('../element');

class File extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'file');
  }

}

module.exports = File;
