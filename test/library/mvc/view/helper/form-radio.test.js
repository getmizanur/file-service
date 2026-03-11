const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormRadio = require(path.join(projectRoot, 'library/mvc/view/helper/form-radio'));
const Element = require(path.join(projectRoot, 'library/form/element'));
const Radio = require(path.join(projectRoot, 'library/form/element/radio'));

describe('FormRadio', () => {
  let helper;

  beforeEach(() => {
    helper = new FormRadio();
  });

  // --- render with non-element ---
  describe('render with non-element', () => {
    it('should return empty string for null', () => {
      expect(helper.render(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(helper.render(undefined)).toBe('');
    });

    it('should return empty string for plain object without getAttribute', () => {
      expect(helper.render({ name: 'test' })).toBe('');
    });

    it('should return empty string for string argument', () => {
      expect(helper.render('bad')).toBe('');
    });

    it('should work with compatible object that has getAttribute', () => {
      const compatible = {
        getAttribute: (key) => {
          const map = { type: 'radio', name: 'color' };
          return map[key] || null;
        },
        getValue: () => null,
        getValueOptions: () => []
      };
      const result = helper.render(compatible);
      // Should not return empty string, it renders (even if options are empty)
      expect(result).toBe('');
    });
  });

  // --- _renderSingle ---
  describe('_renderSingle (render with valueOption)', () => {
    it('should render a single radio input', () => {
      const el = new Radio('gender');
      el.setAttribute('name', 'gender');
      const valueOption = { value: 'male' };
      const result = helper.render(el, valueOption);
      expect(result).toContain('<input');
      expect(result).toContain('type="radio"');
      expect(result).toContain('name="gender"');
      expect(result).toContain('value="male"');
      expect(result).toContain('id="gender-male"');
      expect(result).toContain('/>');
    });

    it('should render checked radio when element value matches', () => {
      const el = new Radio('color');
      el.setAttribute('name', 'color');
      el.setAttribute('value', 'red');
      const valueOption = { value: 'red' };
      const result = helper.render(el, valueOption);
      expect(result).toContain('checked="checked"');
    });

    it('should not render checked when element value does not match', () => {
      const el = new Radio('color');
      el.setAttribute('name', 'color');
      el.setAttribute('value', 'blue');
      const valueOption = { value: 'red' };
      const result = helper.render(el, valueOption);
      expect(result).not.toContain('checked');
    });

    it('should use custom id from valueOption attributes', () => {
      const el = new Radio('size');
      el.setAttribute('name', 'size');
      const valueOption = { value: 'large', attributes: { id: 'custom-id' } };
      const result = helper.render(el, valueOption);
      expect(result).toContain('id="custom-id"');
      expect(result).not.toContain('id="size-large"');
    });

    it('should generate id with underscores replacing spaces in value', () => {
      const el = new Radio('option');
      el.setAttribute('name', 'option');
      const valueOption = { value: 'my choice' };
      const result = helper.render(el, valueOption);
      expect(result).toContain('id="option-my_choice"');
    });

    it('should include custom attributes from valueOption', () => {
      const el = new Radio('field');
      el.setAttribute('name', 'field');
      const valueOption = {
        value: 'yes',
        attributes: { class: 'radio-input', 'data-info': 'extra' }
      };
      const result = helper.render(el, valueOption);
      expect(result).toContain('class="radio-input"');
      expect(result).toContain('data-info="extra"');
    });

    it('should handle boolean true attribute in valueOption', () => {
      const el = new Radio('field');
      el.setAttribute('name', 'field');
      const valueOption = {
        value: 'val',
        attributes: { 'aria-required': true }
      };
      const result = helper.render(el, valueOption);
      expect(result).toContain('aria-required ');
    });

    it('should skip null/undefined/false attributes in valueOption', () => {
      const el = new Radio('field');
      el.setAttribute('name', 'field');
      const valueOption = {
        value: 'val',
        attributes: { disabled: false, hidden: null, missing: undefined }
      };
      const result = helper.render(el, valueOption);
      expect(result).not.toContain('disabled');
      expect(result).not.toContain('hidden');
      expect(result).not.toContain('missing');
    });

    it('should fallback to radio type when element has no type', () => {
      const el = new Element();
      el.setAttribute('name', 'choice');
      // Element without type set (not Radio subclass)
      const valueOption = { value: 'a' };
      const result = helper.render(el, valueOption);
      expect(result).toContain('type="radio"');
    });
  });

  // --- renderOptions ---
  describe('renderOptions', () => {
    it('should render multiple radio options with GOV.UK markup', () => {
      const el = new Radio('color');
      el.setAttribute('name', 'color');
      el.setValueOptions([
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
        { value: 'green', label: 'Green' }
      ]);
      const result = helper.render(el);
      expect(result).toContain('dp-radios__item');
      expect(result).toContain('value="red"');
      expect(result).toContain('value="blue"');
      expect(result).toContain('value="green"');
      expect(result).toContain('Red');
      expect(result).toContain('Blue');
      expect(result).toContain('Green');
    });

    it('should mark the checked option based on element value', () => {
      const el = new Radio('size');
      el.setAttribute('name', 'size');
      el.setAttribute('value', 'medium');
      el.setValueOptions([
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      const result = helper.render(el);
      // Extract each option item
      const items = result.split('dp-radios__item');
      // The medium item (3rd split part, index 2) should have checked
      const mediumItem = items.find(i => i.includes('value="medium"'));
      expect(mediumItem).toContain('checked="checked"');
      // Small and large should not be checked
      const smallItem = items.find(i => i.includes('value="small"'));
      expect(smallItem).not.toContain('checked');
      const largeItem = items.find(i => i.includes('value="large"'));
      expect(largeItem).not.toContain('checked');
    });

    it('should return empty string when no value options', () => {
      const el = new Radio('empty');
      el.setAttribute('name', 'empty');
      el.setValueOptions([]);
      const result = helper.render(el);
      expect(result).toBe('');
    });

    it('should generate default ids from name and value', () => {
      const el = new Radio('fruit');
      el.setAttribute('name', 'fruit');
      el.setValueOptions([
        { value: 'apple', label: 'Apple' }
      ]);
      const result = helper.render(el);
      expect(result).toContain('id="fruit-apple"');
      expect(result).toContain('for="fruit-apple"');
    });

    it('should use custom id from option attributes', () => {
      const el = new Radio('drink');
      el.setAttribute('name', 'drink');
      el.setValueOptions([
        { value: 'water', label: 'Water', attributes: { id: 'custom-water-id' } }
      ]);
      const result = helper.render(el);
      expect(result).toContain('id="custom-water-id"');
    });

    it('should handle value options with spaces in value', () => {
      const el = new Radio('choice');
      el.setAttribute('name', 'choice');
      el.setValueOptions([
        { value: 'option one', label: 'Option One' }
      ]);
      const result = helper.render(el);
      expect(result).toContain('id="choice-option_one"');
    });
  });

  // --- _renderOptionItem ---
  describe('_renderOptionItem', () => {
    it('should render a GOV.UK style radio item', () => {
      const opt = { value: 'yes', label: 'Yes' };
      const result = helper._renderOptionItem(opt, 'radio', 'confirm', undefined);
      expect(result).toContain('<div class="dp-radios__item">');
      expect(result).toContain('<input type="radio"');
      expect(result).toContain('name="confirm"');
      expect(result).toContain('value="yes"');
      expect(result).toContain('<label');
      expect(result).toContain('Yes');
      expect(result).toContain('</label></div>');
    });

    it('should mark checked when elementValue matches option value', () => {
      const opt = { value: 'yes', label: 'Yes' };
      const result = helper._renderOptionItem(opt, 'radio', 'confirm', 'yes');
      expect(result).toContain('checked="checked"');
    });

    it('should not mark checked when elementValue does not match', () => {
      const opt = { value: 'yes', label: 'Yes' };
      const result = helper._renderOptionItem(opt, 'radio', 'confirm', 'no');
      expect(result).not.toContain('checked');
    });

    it('should escape HTML in label content', () => {
      const opt = { value: 'test', label: '<b>Bold</b>' };
      const result = helper._renderOptionItem(opt, 'radio', 'field', undefined);
      expect(result).toContain('&lt;b&gt;Bold&lt;/b&gt;');
    });

    it('should use custom label_attributes', () => {
      const opt = {
        value: 'x',
        label: 'X Label',
        label_attributes: { class: 'custom-label', 'for': 'my-for' }
      };
      const result = helper._renderOptionItem(opt, 'radio', 'field', undefined);
      expect(result).toContain('class="custom-label"');
      expect(result).toContain('for="my-for"');
    });

    it('should set default for attribute on label matching id', () => {
      const opt = { value: 'val', label: 'Val' };
      const result = helper._renderOptionItem(opt, 'radio', 'myname', undefined);
      expect(result).toContain('for="myname-val"');
    });
  });

  // --- Branch coverage: renderOptions edge cases ---
  describe('renderOptions branch coverage', () => {
    it('should handle element without getValue function (line 85)', () => {
      const el = {
        getAttribute: (key) => ({ name: 'choice', type: 'radio' }[key]),
        getValueOptions: () => [{ value: 'a', label: 'A' }]
      };
      const result = helper.render(el);
      expect(result).toContain('value="a"');
      expect(result).not.toContain('checked');
    });

    it('should handle getValueOptions returning null (line 80)', () => {
      const el = {
        getAttribute: (key) => ({ name: 'choice', type: 'radio' }[key]),
        getValueOptions: () => null,
        getValue: () => 'a'
      };
      const result = helper.render(el);
      expect(result).toBe('');
    });

    it('should handle element without getValueOptions function (line 79)', () => {
      const el = {
        getAttribute: (key) => ({ name: 'choice', type: 'radio' }[key]),
        getValue: () => 'a'
      };
      const result = helper.render(el);
      expect(result).toBe('');
    });

    it('should handle getAttribute returning null for name (line 34/84)', () => {
      const el = {
        getAttribute: () => null,
        getValueOptions: () => [{ value: 'x', label: 'X' }],
        getValue: () => null
      };
      const result = helper.render(el);
      expect(result).toContain('type="radio"');
      expect(result).toContain('name=""');
    });

    it('should handle _renderSingle with getValue not a function (line 41)', () => {
      const el = {
        getAttribute: (key) => ({ name: 'test', type: 'radio' }[key])
      };
      const result = helper.render(el, { value: 'val', attributes: {} });
      expect(result).toContain('value="val"');
      expect(result).not.toContain('checked');
    });

    it('should handle _renderSingle with id being null (line 46)', () => {
      const el = {
        getAttribute: (key) => ({ name: '', type: 'radio' }[key]),
        getValue: () => null
      };
      const result = helper.render(el, { value: 'val', attributes: {} });
      expect(result).toContain('value="val"');
    });

    it('should skip inherited properties in _serializeAttribs (line 119)', () => {
      const parent = { inherited: 'nope' };
      const attrs = Object.create(parent);
      attrs.name = 'field';
      const result = helper._serializeAttribs(attrs);
      expect(result).toContain('name="field"');
      expect(result).not.toContain('inherited');
    });
  });

  // --- _serializeAttribs ---
  describe('_serializeAttribs', () => {
    it('should serialize string attributes as key="value"', () => {
      const result = helper._serializeAttribs({ class: 'item', id: 'r1' });
      expect(result).toContain('class="item"');
      expect(result).toContain('id="r1"');
    });

    it('should render boolean true as valueless attribute', () => {
      const result = helper._serializeAttribs({ disabled: true });
      expect(result).toBe('disabled ');
    });

    it('should skip null values', () => {
      const result = helper._serializeAttribs({ gone: null });
      expect(result).toBe('');
    });

    it('should skip undefined values', () => {
      const result = helper._serializeAttribs({ missing: undefined });
      expect(result).toBe('');
    });

    it('should skip false values', () => {
      const result = helper._serializeAttribs({ off: false });
      expect(result).toBe('');
    });

    it('should escape attribute values', () => {
      const result = helper._serializeAttribs({ title: 'say "hello"' });
      expect(result).toContain('title="say &quot;hello&quot;"');
    });

    it('should handle mixed attribute types', () => {
      const result = helper._serializeAttribs({
        id: 'test',
        checked: true,
        disabled: false,
        title: null,
        class: 'active'
      });
      expect(result).toContain('id="test"');
      expect(result).toContain('checked ');
      expect(result).toContain('class="active"');
      expect(result).not.toContain('disabled');
      expect(result).not.toContain('title');
    });
  });
});
