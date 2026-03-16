// application/form/element/form-image-button.js
const Xhtml = require(globalThis.applicationPath('/library/form/element/xhtml'));

/**
 * FormImageButton - A <button> element that supports inner HTML content
 * such as SVG icons, images, or mixed markup.
 *
 * Extends the Xhtml element with the tag pre-set to 'button'.
 *
 * Example:
 *   const btn = new FormImageButton('search-clear');
 *   btn.setAttributes({ class: 'btn btn-link', title: 'Clear' });
 *   btn.setContent('<svg>...</svg>');
 */
class FormImageButton extends Xhtml {

  constructor(name = null) {
    super(name);

    this.setTag('button');
    this.setAttribute('type', 'button');
  }
}

module.exports = FormImageButton;
