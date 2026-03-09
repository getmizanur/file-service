// library/mvc/view/helper/form-radio.js
const Element = require('../../../form/element');
const StringUtil = require('../../../util/string-util');
const AbstractHelper = require('./abstract-helper');

class FormRadio extends AbstractHelper {

  /**
   * Render a single radio (when valueOption provided) OR render all options
   */
  render(...args) {
    const { args: cleanArgs, context } = this._extractContext(args);
    const [element, valueOption = null] = cleanArgs;

    if (!(element instanceof Element)) {
      // keep it lenient (some code may pass a compatible element object)
      if (!element || typeof element.getAttribute !== 'function') {
        return '';
      }
    }

    return this.withContext(context, () => {
      if (valueOption != null) {
        return this._renderSingle(element, valueOption);
      }
      return this.renderOptions(element);
    });
  }

  _renderSingle(element, valueOption) {
    const value = valueOption.value;
    const type = element.getAttribute('type') || 'radio';
    const attributes = valueOption.attributes || {};
    const name = element.getAttribute('name') || '';

    const id = attributes.id
      ? attributes.id
      : (name + '-' + StringUtil.strReplace(' ', '_', value));

    // Check if this radio button should be checked
    const elementValue = (typeof element.getValue === 'function') ? element.getValue() : undefined;
    const isChecked = (elementValue === value);

    let render = `<input type="${this._escapeAttr(type)}" name="${this._escapeAttr(name)}" `;

    if (id != null) {
      render += `id="${this._escapeAttr(id)}" `;
    }

    for (const key in attributes) {
      if (!Object.hasOwn(attributes, key)) continue;

      const val = attributes[key];
      if (val === null || val === undefined || val === false) continue;

      if (val === true) {
        render += `${key} `;
        continue;
      }

      render += `${key}="${this._escapeAttr(val)}" `;
    }

    render += `value="${this._escapeAttr(value)}"`;

    if (isChecked) {
      render += ' checked="checked"';
    }

    render += '/>';

    return render;
  }

  /**
   * Render all options as GOV.UK style radios markup
   */
  renderOptions(element) {
    const valueOptions = (typeof element.getValueOptions === 'function')
      ? (element.getValueOptions() || [])
      : [];

    const type = element.getAttribute('type') || 'radio';
    const name = element.getAttribute('name') || '';
    const elementValue = (typeof element.getValue === 'function') ? element.getValue() : undefined;

    let render = '';
    for (const option of valueOptions) {
      render += this._renderOptionItem(option || {}, type, name, elementValue);
    }
    return render;
  }

  _renderOptionItem(opt, type, name, elementValue) {
    const { value, label: labelContent } = opt;
    const attributes = opt.attributes || {};
    const labelAttributes = opt.label_attributes || {};

    const defaultId = name + '-' + StringUtil.strReplace(' ', '_', value);
    attributes.id = attributes.id || defaultId;
    labelAttributes['for'] = labelAttributes['for'] || defaultId;

    let html = '<div class="dp-radios__item">';
    html += `<input type="${this._escapeAttr(type)}" name="${this._escapeAttr(name)}" `;
    html += this._serializeAttribs(attributes);
    html += `value="${this._escapeAttr(value)}"`;
    if (elementValue === value) html += ' checked="checked"';
    html += '/>';

    html += `<label ${this._serializeAttribs(labelAttributes)}>`;
    html += this._escapeHtml(labelContent);
    html += '</label></div>';
    return html;
  }

  _serializeAttribs(attribs) {
    let result = '';
    for (const key in attribs) {
      if (!Object.hasOwn(attribs, key)) continue;
      const val = attribs[key];
      if (val === null || val === undefined || val === false) continue;
      if (val === true) { result += `${key} `; continue; }
      result += `${key}="${this._escapeAttr(val)}" `;
    }
    return result;
  }
}

module.exports = FormRadio;