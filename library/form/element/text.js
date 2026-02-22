const Element = require('../element');

class Text extends Element {

  constructor(name = null) {
    super();

    if (name !== null && name !== undefined && name !== '') {
      this.setName(name);
    }

    this.setAttribute('type', 'text');
  }

}

module.exports = Text;