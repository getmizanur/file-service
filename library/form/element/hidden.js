const Element = require('../element');

class Hidden extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'hidden');
  }

}

module.exports = Hidden;
