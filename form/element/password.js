// library/form/element/password.js
const Element = require('../element');

class Password extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    this.setAttribute('type', 'password');
  }

}

module.exports = Password;