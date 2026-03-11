const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormLabel = require(path.join(projectRoot, 'library/mvc/view/helper/form-label'));
const Element = require(path.join(projectRoot, 'library/form/element'));

describe('FormLabel', () => {
  let helper;

  beforeEach(() => {
    helper = new FormLabel();
  });

  // --- render with Element ---
  describe('render', () => {
    it('should render label from Element with getLabel()', () => {
      const el = new Element();
      el.setLabel('Username');
      el.setAttribute('id', 'input-username');
      const result = helper.render(el);
      expect(result).toContain('Username');
      expect(result).toContain('for="input-username"');
      expect(result).toContain('<label');
      expect(result).toContain('</label>');
    });

    it('should render label with explicit labelContent overriding getLabel()', () => {
      const el = new Element();
      el.setLabel('Original');
      el.setAttribute('id', 'field-1');
      const result = helper.render(el, 'Override Label');
      expect(result).toContain('Override Label');
      expect(result).not.toContain('Original');
    });

    it('should render empty label text when Element has no label and no labelContent', () => {
      const el = new Element();
      el.setAttribute('id', 'field-empty');
      const result = helper.render(el);
      expect(result).toContain('<label');
      expect(result).toContain('</label>');
      expect(result).toContain('for="field-empty"');
    });

    it('should add required asterisk when Element has required attribute', () => {
      const el = new Element();
      el.setLabel('Email');
      el.setAttribute('id', 'email');
      el.setAttribute('required', true);
      const result = helper.render(el);
      expect(result).toContain('dp-required-asterisk');
      expect(result).toContain('aria-hidden="true"');
      expect(result).toContain('*');
    });

    it('should not add required asterisk when Element has no required attribute', () => {
      const el = new Element();
      el.setLabel('Name');
      const result = helper.render(el);
      expect(result).not.toContain('dp-required-asterisk');
    });

    it('should render label with plain object attribs', () => {
      const attribs = { class: 'form-label', id: 'lbl-1' };
      const result = helper.render(attribs, 'My Label');
      expect(result).toContain('class="form-label"');
      expect(result).toContain('for="lbl-1"');
      expect(result).toContain('My Label');
      expect(result).toContain('</label>');
    });

    it('should add required asterisk for plain object with required=true', () => {
      const attribs = { required: true };
      const result = helper.render(attribs, 'Required Field');
      expect(result).toContain('dp-required-asterisk');
    });

    it('should not add required asterisk for plain object without required', () => {
      const attribs = { class: 'label' };
      const result = helper.render(attribs, 'Optional');
      expect(result).not.toContain('dp-required-asterisk');
    });

    it('should escape HTML in label text', () => {
      const el = new Element();
      el.setLabel('<script>alert(1)</script>');
      const result = helper.render(el);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>alert(1)</script>');
    });

    it('should include label attributes from Element.getLabelAttributes()', () => {
      const el = new Element();
      el.setLabel('Field');
      el.setAttribute('id', 'my-field');
      el.setLabelAttribute('class', 'custom-label');
      const result = helper.render(el);
      expect(result).toContain('class="custom-label"');
      expect(result).toContain('for="my-field"');
    });
  });

  // --- _isRequired ---
  describe('_isRequired', () => {
    it('should return true for Element with required attribute', () => {
      const el = new Element();
      el.setAttribute('required', true);
      expect(helper._isRequired(el)).toBe(true);
    });

    it('should return false for Element without required attribute', () => {
      const el = new Element();
      expect(helper._isRequired(el)).toBe(false);
    });

    it('should return true for plain object with required=true', () => {
      expect(helper._isRequired({ required: true })).toBe(true);
    });

    it('should return false for plain object with required=false', () => {
      expect(helper._isRequired({ required: false })).toBe(false);
    });

    it('should return false for null', () => {
      expect(helper._isRequired(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(helper._isRequired(undefined)).toBe(false);
    });
  });

  // --- _resolveLabelText ---
  describe('_resolveLabelText', () => {
    it('should return labelContent when provided', () => {
      const el = new Element();
      el.setLabel('Element Label');
      expect(helper._resolveLabelText(el, 'Explicit')).toBe('Explicit');
    });

    it('should return element.getLabel() when no labelContent', () => {
      const el = new Element();
      el.setLabel('From Element');
      expect(helper._resolveLabelText(el, null)).toBe('From Element');
    });

    it('should return empty string when no labelContent and no element label', () => {
      expect(helper._resolveLabelText({}, null)).toBe('');
    });

    it('should return empty string labelContent as-is (empty string is not null)', () => {
      expect(helper._resolveLabelText({}, '')).toBe('');
    });
  });

  // --- openTag ---
  describe('openTag', () => {
    it('should return plain <label> when called with null', () => {
      expect(helper.openTag(null)).toBe('<label>');
    });

    it('should return plain <label> when called with no arguments', () => {
      expect(helper.openTag()).toBe('<label>');
    });

    it('should return label with for attribute when Element has id', () => {
      const el = new Element();
      el.setAttribute('id', 'my-input');
      const result = helper.openTag(el);
      expect(result).toContain('<label');
      expect(result).toContain('for="my-input"');
      expect(result).toContain('>');
    });

    it('should return label with attributes from plain object', () => {
      const result = helper.openTag({ class: 'form-label', id: 'lbl' });
      expect(result).toContain('class="form-label"');
      expect(result).toContain('for="lbl"');
    });

    it('should throw TypeError for array argument', () => {
      expect(() => helper.openTag(['bad'])).toThrow(TypeError);
      expect(() => helper.openTag(['bad'])).toThrow('Expect an Element or an attributes object');
    });

    it('should throw TypeError for non-object argument (string)', () => {
      expect(() => helper.openTag('bad')).toThrow(TypeError);
    });

    it('should throw TypeError for non-object argument (number)', () => {
      expect(() => helper.openTag(42)).toThrow(TypeError);
    });

    it('should handle Element with label attributes', () => {
      const el = new Element();
      el.setAttribute('id', 'test-id');
      el.setLabelAttribute('class', 'label-class');
      el.setLabelAttribute('data-info', 'extra');
      const result = helper.openTag(el);
      expect(result).toContain('class="label-class"');
      expect(result).toContain('data-info="extra"');
      expect(result).toContain('for="test-id"');
    });

    it('should omit for attribute when object has no id', () => {
      const result = helper.openTag({ class: 'x' });
      expect(result).toContain('class="x"');
      expect(result).not.toContain('for=');
    });

    it('should omit for attribute when Element has no id', () => {
      const el = new Element();
      const result = helper.openTag(el);
      expect(result).toContain('<label');
      expect(result).not.toContain('for=');
    });
  });

  // --- _serializeAttributes ---
  describe('_serializeAttributes', () => {
    it('should skip null values', () => {
      const result = helper._serializeAttributes({ a: null });
      expect(result).toBe('');
    });

    it('should skip undefined values', () => {
      const result = helper._serializeAttributes({ a: undefined });
      expect(result).toBe('');
    });

    it('should skip false values', () => {
      const result = helper._serializeAttributes({ disabled: false });
      expect(result).toBe('');
    });

    it('should render boolean true as valueless attribute', () => {
      const result = helper._serializeAttributes({ disabled: true });
      expect(result).toBe('disabled ');
    });

    it('should render string values as key="value"', () => {
      const result = helper._serializeAttributes({ class: 'foo' });
      expect(result).toBe('class="foo" ');
    });

    it('should handle multiple attributes', () => {
      const result = helper._serializeAttributes({ class: 'a', id: 'b', hidden: true, skip: null });
      expect(result).toContain('class="a"');
      expect(result).toContain('id="b"');
      expect(result).toContain('hidden ');
      expect(result).not.toContain('skip');
    });

    it('should return empty string for null input', () => {
      expect(helper._serializeAttributes(null)).toBe('');
    });

    it('should return empty string for non-object input', () => {
      expect(helper._serializeAttributes('string')).toBe('');
    });

    it('should escape attribute values', () => {
      const result = helper._serializeAttributes({ title: 'a "b" c' });
      expect(result).toContain('title="a &quot;b&quot; c"');
    });
  });

  // --- closeTag ---
  describe('closeTag', () => {
    it('should return </label>', () => {
      expect(helper.closeTag()).toBe('</label>');
    });
  });
});
