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
      if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

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
    let render = '';

    const valueOptions = (typeof element.getValueOptions === 'function')
      ? (element.getValueOptions() || [])
      : [];

    const type = element.getAttribute('type') || 'radio';
    const name = element.getAttribute('name') || '';

    const elementValue = (typeof element.getValue === 'function') ? element.getValue() : undefined;

    for (let i = 0; i < valueOptions.length; i++) {
      const opt = valueOptions[i] || {};

      const value = opt.value;
      const labelContent = opt.label;
      const attributes = opt.attributes || {};
      const labelAttributes = opt.label_attributes || {};

      const id = (attributes.id)
        ? attributes.id
        : (name + '-' + StringUtil.strReplace(' ', '_', value));
      attributes.id = id;

      const forAttrib = (labelAttributes['for'])
        ? labelAttributes['for']
        : (name + '-' + StringUtil.strReplace(' ', '_', value));
      labelAttributes['for'] = forAttrib;

      const isChecked = (elementValue === value);

      render += '<div class="dp-radios__item">';

      render += `<input type="${this._escapeAttr(type)}" name="${this._escapeAttr(name)}" `;

      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;

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

      render += '<label ';
      for (const key in labelAttributes) {
        if (!Object.prototype.hasOwnProperty.call(labelAttributes, key)) continue;

        const val = labelAttributes[key];
        if (val === null || val === undefined || val === false) continue;

        if (val === true) {
          render += `${key} `;
          continue;
        }

        render += `${key}="${this._escapeAttr(val)}" `;
      }
      render += '>';

      render += this._escapeHtml(labelContent);
      render += '</label>';

      render += '</div>';
    }

    return render;
  }
}

module.exports = FormRadio;