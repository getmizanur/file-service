const Element = require('../element');

class Submit extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'submit');
  }

}

module.exports = Submit;
