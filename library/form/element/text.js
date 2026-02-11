const Element = require('../element');

class Text extends Element {

  constructor(name = null) {
    super();

    this.setName(name);
    this.setAttribute('type', 'text');
  }

}

module.exports = Text;
