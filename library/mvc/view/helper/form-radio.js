const Element = require('../../../form/element');
const StringUtil = require('../../../util/string-util');
const AbstractHelper = require('./abstract-helper');

class FormRadio extends AbstractHelper {

  render(...args) {
    const cleanArgs = this._extractContext(args);
    const [element, valueOption = null] = cleanArgs;

    if(valueOption != null) {
      let value = valueOption.value;
      let type = element.getAttribute('type');
      let labelContent = valueOption.label;
      let attributes = valueOption.attributes;
      let name = element.getAttribute('name');
      let id = ((valueOption.attributes.id) ?
        valueOption.attributes.id : name +
        "-" + StringUtil.strReplace(' ', '_', value));
      // Check if this radio button should be checked
      const elementValue = element.getValue();
      const isChecked = (elementValue === value);

      let render = '<input type="' + type + '" name ="' + name + '" ' +
        ((id != null) ? 'id="' + id + '" ' : '');
      for(let key in attributes) {
        render += key + '="' + attributes[key] + '" ';
      }
      render += 'value="' + value + '"';
      if(isChecked) {
        render += ' checked="checked"';
      }
      render += '/>';

      return render;
    }

    return this.renderOptions(element);
  }

  renderOptions(element) {
    let render = "";

    let valueOptions = element.getValueOptions();
    for(let i = 0; i < valueOptions.length; i++) {
      let type = element.getAttribute('type');
      let value = valueOptions[i].value;
      let labelContent = valueOptions[i].label;
      let attributes = valueOptions[i].attributes;
      let labelAttributes = valueOptions[i].label_attributes;
      let name = element.getAttribute('name');

      let id = ((attributes.id) ? attributes.id :
        name + "-" + StringUtil.strReplace(' ', '_', value));
      attributes['id'] = id;

      let forAttrib = ((labelAttributes.for) ?
        labelAttributes.for : name + "-" + StringUtil.strReplace(' ', '_', value));
      labelAttributes['for'] = forAttrib;

      // Check if this radio button should be checked
      const elementValue = element.getValue();
      const isChecked = (elementValue === value);

      // Wrap each radio in dp-radios__item div
      render += '<div class="dp-radios__item">';
      render += '<input type="' + type + '" name="' + name + '" '
      for(let key in attributes) {
        render += key + '="' + attributes[key] + '" ';
      }
      render += 'value="' + value + '"';
      if(isChecked) {
        render += ' checked="checked"';
      }
      render += '/>'
      render += '<label ';
      for(let key in labelAttributes) {
        render += key + '="' + labelAttributes[key] + '" '
      }
      render += '>';
      render += labelContent + '</label>';
      render += '</div>';
    }

    return render;
  }

}

module.exports = FormRadio;