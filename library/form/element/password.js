const Element = require('../element');

class Password extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'password');
  }

}

module.exports = Password;