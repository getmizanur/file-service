const AbstractHelper = require('./abstract-helper');

class FormSubmit extends AbstractHelper {

  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element] = cleanArgs;

    if(element == undefined) {
      return;
    }
    var input = '<input ';
    var attributes = element.getAttributes();
    let hasClass = false;
    for(var key in attributes) {
      if(key === 'class') {
        input += 'class="' + attributes[key] + ' dp-button" ';
        hasClass = true;
      } else {
        input += key + '="' + attributes[key] + '" ';
      }
    }
    if(!hasClass) {
      input += 'class="dp-button" ';
    }
    input += '/>';
    return input;
  }

}

module.exports = FormSubmit;