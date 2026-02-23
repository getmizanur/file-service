// library/form/element/hidden.js
const Element = require('../element');

class Hidden extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    this.setAttribute('type', 'hidden');
  }

}

module.exports = Hidden;