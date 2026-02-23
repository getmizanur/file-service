// library/form/element/file.js
const Element = require('../element');

class File extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    this.setAttribute('type', 'file');
  }

}

module.exports = File;