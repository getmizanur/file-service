const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Form = require(path.join(projectRoot, 'library/form/form'));
const Element = require(path.join(projectRoot, 'library/form/element'));
const Text = require(path.join(projectRoot, 'library/form/element/text'));

describe('Form', () => {

  let form;

  beforeEach(() => {
    form = new Form();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(form.elements).toEqual({});
      expect(form.attribs).toEqual({});
      expect(form.data).toBeNull();
      expect(form.inputFilter).toBeNull();
      expect(form.debug).toBe(false);
    });

    it('should accept options', () => {
      const f = new Form({ debug: true });
      expect(f.debug).toBe(true);
    });

    it('should accept empty options', () => {
      const f = new Form({});
      expect(f.debug).toBe(false);
    });
  });

  describe('_log()', () => {
    it('should not log when debug is false', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      form._log('test');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log when debug is true', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      const f = new Form({ debug: true });
      f._log('test message');
      expect(spy).toHaveBeenCalledWith('[Form]', 'test message');
      spy.mockRestore();
    });
  });

  describe('add()', () => {
    it('should add an element', () => {
      const el = new Text('username');
      const result = form.add(el);
      expect(result).toBe(form); // chainable
      expect(form.has('username')).toBe(true);
    });

    it('should throw if element is null', () => {
      expect(() => form.add(null)).toThrow(TypeError);
    });

    it('should throw if element does not implement getName()', () => {
      expect(() => form.add({ name: 'foo' })).toThrow('Form.add(): element must implement getName()');
    });

    it('should throw if element is undefined', () => {
      expect(() => form.add(undefined)).toThrow(TypeError);
    });
  });

  describe('get()', () => {
    it('should return element by name', () => {
      const el = new Text('email');
      form.add(el);
      expect(form.get('email')).toBe(el);
    });

    it('should return undefined for non-existent element', () => {
      expect(form.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true when element exists', () => {
      form.add(new Text('name'));
      expect(form.has('name')).toBe(true);
    });

    it('should return false when element does not exist', () => {
      expect(form.has('missing')).toBe(false);
    });
  });

  describe('remove()', () => {
    it('should remove an existing element', () => {
      form.add(new Text('name'));
      const result = form.remove('name');
      expect(result).toBe(form);
      expect(form.has('name')).toBe(false);
    });

    it('should return form if element does not exist', () => {
      const result = form.remove('nonexistent');
      expect(result).toBe(form);
    });
  });

  describe('getElements()', () => {
    it('should return all elements', () => {
      form.add(new Text('a'));
      form.add(new Text('b'));
      const elements = form.getElements();
      expect(Object.keys(elements)).toEqual(['a', 'b']);
    });

    it('should return empty object when no elements', () => {
      expect(form.getElements()).toEqual({});
    });
  });

  describe('attribute methods', () => {
    describe('setAttrib() / getAttrib()', () => {
      it('should set and get an attribute', () => {
        form.setAttrib('id', 'myForm');
        expect(form.getAttrib('id')).toBe('myForm');
      });

      it('should return null for non-existent attribute', () => {
        expect(form.getAttrib('missing')).toBeNull();
      });

      it('should be chainable', () => {
        expect(form.setAttrib('id', 'x')).toBe(form);
      });
    });

    describe('addAttribs()', () => {
      it('should merge multiple attributes', () => {
        form.setAttrib('id', 'myForm');
        form.addAttribs({ class: 'form', action: '/submit' });
        expect(form.getAttrib('id')).toBe('myForm');
        expect(form.getAttrib('class')).toBe('form');
        expect(form.getAttrib('action')).toBe('/submit');
      });

      it('should handle null input gracefully', () => {
        const result = form.addAttribs(null);
        expect(result).toBe(form);
      });

      it('should handle non-object input gracefully', () => {
        const result = form.addAttribs('string');
        expect(result).toBe(form);
      });
    });

    describe('setAttribs()', () => {
      it('should replace all attributes', () => {
        form.setAttrib('id', 'myForm');
        form.setAttribs({ class: 'new' });
        expect(form.getAttrib('id')).toBeNull();
        expect(form.getAttrib('class')).toBe('new');
      });

      it('should be chainable', () => {
        expect(form.setAttribs({ a: 1 })).toBe(form);
      });
    });

    describe('getAttribs()', () => {
      it('should return all attributes', () => {
        form.setAttrib('a', 1);
        form.setAttrib('b', 2);
        expect(form.getAttribs()).toEqual({ a: 1, b: 2 });
      });
    });

    describe('getAttributes()', () => {
      it('should be an alias for getAttribs()', () => {
        form.setAttrib('x', 'y');
        expect(form.getAttributes()).toBe(form.getAttribs());
      });
    });

    describe('removeAttrib()', () => {
      it('should remove an attribute', () => {
        form.setAttrib('id', 'myForm');
        form.removeAttrib('id');
        expect(form.getAttrib('id')).toBeNull();
      });

      it('should be chainable', () => {
        expect(form.removeAttrib('x')).toBe(form);
      });
    });

    describe('clearAttribs()', () => {
      it('should remove all attributes', () => {
        form.setAttrib('a', 1);
        form.setAttrib('b', 2);
        form.clearAttribs();
        expect(form.getAttribs()).toEqual({});
      });

      it('should be chainable', () => {
        expect(form.clearAttribs()).toBe(form);
      });
    });
  });

  describe('action and method shortcuts', () => {
    it('setAction/getAction should use attribs', () => {
      form.setAction('/submit');
      expect(form.getAction()).toBe('/submit');
      expect(form.getAttrib('action')).toBe('/submit');
    });

    it('setMethod/getMethod should use attribs', () => {
      form.setMethod('POST');
      expect(form.getMethod()).toBe('POST');
      expect(form.getAttrib('method')).toBe('POST');
    });
  });

  describe('data methods', () => {
    describe('setData() / getData()', () => {
      it('should store data and populate elements', () => {
        form.add(new Text('name'));
        form.setData({ name: 'John' });
        expect(form.getData()).toEqual({ name: 'John' });
        expect(form.get('name').getValue()).toBe('John');
      });

      it('should default to empty object if null', () => {
        form.setData(null);
        expect(form.getData()).toEqual({});
      });
    });

    describe('populateValues()', () => {
      it('should populate element values from data', () => {
        form.add(new Text('email'));
        form.add(new Text('name'));
        form.populateValues({ email: 'test@test.com', name: 'Alice' });
        expect(form.get('email').getValue()).toBe('test@test.com');
        expect(form.get('name').getValue()).toBe('Alice');
      });

      it('should ignore data keys that do not match elements', () => {
        form.add(new Text('name'));
        form.populateValues({ name: 'Bob', extra: 'ignored' });
        expect(form.get('name').getValue()).toBe('Bob');
      });

      it('should handle null data gracefully', () => {
        const result = form.populateValues(null);
        expect(result).toBe(form);
      });

      it('should handle non-object data gracefully', () => {
        const result = form.populateValues('string');
        expect(result).toBe(form);
      });

      it('should skip undefined values', () => {
        form.add(new Text('name'));
        form.get('name').setValue('original');
        form.populateValues({ name: undefined });
        // undefined is skipped so value stays as-is (attribute was set before)
        expect(form.get('name').getValue()).toBe('original');
      });

      it('should convert null values to empty string', () => {
        form.add(new Text('name'));
        form.populateValues({ name: null });
        expect(form.get('name').getValue()).toBe('');
      });
    });

    describe('getValues()', () => {
      it('should return values from all elements', () => {
        form.add(new Text('a'));
        form.add(new Text('b'));
        form.get('a').setValue('val1');
        form.get('b').setValue('val2');
        expect(form.getValues()).toEqual({ a: 'val1', b: 'val2' });
      });

      it('should skip empty/null values', () => {
        form.add(new Text('a'));
        form.add(new Text('b'));
        form.get('a').setValue('val1');
        // b has no value set, default is null
        const values = form.getValues();
        expect(values).toEqual({ a: 'val1' });
      });
    });

    describe('bind()', () => {
      it('should be an alias for setData()', () => {
        form.add(new Text('name'));
        const result = form.bind({ name: 'Test' });
        expect(result).toBe(form);
        expect(form.getData()).toEqual({ name: 'Test' });
        expect(form.get('name').getValue()).toBe('Test');
      });
    });

    describe('reset()', () => {
      it('should reset all element values', () => {
        form.add(new Text('name'));
        form.get('name').setValue('John');
        const result = form.reset();
        expect(result).toBe(form);
        expect(form.get('name').getValue()).toBe('');
        expect(form.getData()).toEqual({});
      });

      it('should reset checkbox elements by clearing checked', () => {
        const checkbox = new Element();
        checkbox.setName('agree');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.setAttribute('checked', 'checked');
        form.add(checkbox);
        form.reset();
        expect(checkbox.getAttribute('checked')).toBeNull();
      });

      it('should reset radio elements by clearing checked', () => {
        const radio = new Element();
        radio.setName('gender');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('checked', 'checked');
        form.add(radio);
        form.reset();
        expect(radio.getAttribute('checked')).toBeNull();
      });
    });
  });

  describe('validation', () => {
    describe('isValid()', () => {
      it('should return true when no input filter is set', () => {
        expect(form.isValid()).toBe(true);
      });

      it('should use input filter for validation', () => {
        const mockInputFilter = {
          setData: jest.fn(),
          isValid: jest.fn().mockReturnValue(true),
        };
        form.setInputFilter(mockInputFilter);
        form.setData({ name: 'test' });
        expect(form.isValid()).toBe(true);
        expect(mockInputFilter.setData).toHaveBeenCalled();
        expect(mockInputFilter.isValid).toHaveBeenCalled();
      });

      it('should return false when input filter says invalid', () => {
        const mockInputFilter = {
          setData: jest.fn(),
          isValid: jest.fn().mockReturnValue(false),
        };
        form.setInputFilter(mockInputFilter);
        expect(form.isValid({ name: '' })).toBe(false);
      });

      it('should use provided data over form data', () => {
        const mockInputFilter = {
          setData: jest.fn(),
          isValid: jest.fn().mockReturnValue(true),
        };
        form.setInputFilter(mockInputFilter);
        form.setData({ name: 'original' });
        form.isValid({ name: 'override' });
        expect(mockInputFilter.setData).toHaveBeenCalledWith({ name: 'override' });
      });

      it('should fall back to empty object when no data', () => {
        const mockInputFilter = {
          setData: jest.fn(),
          isValid: jest.fn().mockReturnValue(true),
        };
        form.setInputFilter(mockInputFilter);
        form.isValid();
        expect(mockInputFilter.setData).toHaveBeenCalledWith({});
      });
    });

    describe('setInputFilter() / getInputFilter()', () => {
      it('should set and get input filter', () => {
        const mockFilter = { isValid: jest.fn() };
        form.setInputFilter(mockFilter);
        expect(form.getInputFilter()).toBe(mockFilter);
      });

      it('should be chainable', () => {
        expect(form.setInputFilter({})).toBe(form);
      });
    });

    describe('getMessages()', () => {
      it('should return empty object when no input filter', () => {
        expect(form.getMessages()).toEqual({});
      });

      it('should return messages from invalid inputs', () => {
        const mockInputFilter = {
          getInvalidInputs: jest.fn().mockReturnValue({
            email: { getMessages: () => ['Invalid email'] },
            name: { getMessages: () => ['Required'] },
          }),
        };
        form.setInputFilter(mockInputFilter);
        const messages = form.getMessages();
        expect(messages).toEqual({
          email: ['Invalid email'],
          name: ['Required'],
        });
      });
    });

    describe('hasErrors()', () => {
      it('should return false when no errors', () => {
        expect(form.hasErrors()).toBe(false);
      });

      it('should return true when there are error messages', () => {
        const mockInputFilter = {
          getInvalidInputs: jest.fn().mockReturnValue({
            field: { getMessages: () => ['Error'] },
          }),
        };
        form.setInputFilter(mockInputFilter);
        expect(form.hasErrors()).toBe(true);
      });
    });
  });

  describe('checkbox population and extraction', () => {
    it('should populate checkbox with boolean true', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      form.add(checkbox);
      form.populateValues({ agree: true });
      expect(checkbox.getAttribute('checked')).toBe('checked');
    });

    it('should populate checkbox with "1"', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      form.add(checkbox);
      form.populateValues({ agree: '1' });
      expect(checkbox.getAttribute('checked')).toBe('checked');
    });

    it('should populate checkbox with numeric 1', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      form.add(checkbox);
      form.populateValues({ agree: 1 });
      expect(checkbox.getAttribute('checked')).toBe('checked');
    });

    it('should populate checkbox with "on"', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      form.add(checkbox);
      form.populateValues({ agree: 'on' });
      expect(checkbox.getAttribute('checked')).toBe('checked');
    });

    it('should uncheck checkbox with false value', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('checked', 'checked');
      form.add(checkbox);
      form.populateValues({ agree: false });
      expect(checkbox.getAttribute('checked')).toBeNull();
    });

    it('should handle checkbox with array value', () => {
      const checkbox = new Element();
      checkbox.setName('colors');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('value', 'red');
      form.add(checkbox);
      form.populateValues({ colors: ['red', 'blue'] });
      expect(checkbox.getAttribute('checked')).toBe('checked');
    });

    it('should uncheck checkbox when value not in array', () => {
      const checkbox = new Element();
      checkbox.setName('colors');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('value', 'green');
      form.add(checkbox);
      form.populateValues({ colors: ['red', 'blue'] });
      expect(checkbox.getAttribute('checked')).toBeNull();
    });

    it('should extract checked checkbox value', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('checked', 'checked');
      checkbox.setAttribute('value', 'yes');
      form.add(checkbox);
      const values = form.getValues();
      expect(values.agree).toBe('yes');
    });

    it('should default unchecked checkbox to no value', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      form.add(checkbox);
      const values = form.getValues();
      expect(values.agree).toBeUndefined();
    });

    it('should extract checkbox value as array when multiple checkboxes share the same name', () => {
      // Simulate multiple checked checkboxes with the same name by calling
      // _extractCheckboxValue directly, since Form.add overwrites by name.
      const cb1 = new Element();
      cb1.setName('colors');
      cb1.setAttribute('type', 'checkbox');
      cb1.setAttribute('checked', 'checked');
      cb1.setAttribute('value', 'red');

      const cb2 = new Element();
      cb2.setName('colors');
      cb2.setAttribute('type', 'checkbox');
      cb2.setAttribute('checked', 'checked');
      cb2.setAttribute('value', 'blue');

      const values = {};
      form._extractCheckboxValue(cb1, 'colors', values);
      form._extractCheckboxValue(cb2, 'colors', values);

      expect(Array.isArray(values.colors)).toBe(true);
      expect(values.colors).toEqual(['red', 'blue']);
    });

    it('should use "on" as default value for checked checkbox without explicit value', () => {
      const checkbox = new Element();
      checkbox.setName('agree');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('checked', 'checked');
      // no value attribute set
      form.add(checkbox);
      const values = form.getValues();
      expect(values.agree).toBe('on');
    });
  });

  describe('radio population and extraction', () => {
    it('should populate radio with matching value', () => {
      const radio = new Element();
      radio.setName('gender');
      radio.setAttribute('type', 'radio');
      radio.setAttribute('value', 'male');
      form.add(radio);
      form.populateValues({ gender: 'male' });
      expect(radio.getAttribute('checked')).toBe('checked');
    });

    it('should not check radio with non-matching value', () => {
      const radio = new Element();
      radio.setName('gender');
      radio.setAttribute('type', 'radio');
      radio.setAttribute('value', 'female');
      form.add(radio);
      form.populateValues({ gender: 'male' });
      expect(radio.getAttribute('checked')).toBeNull();
    });

    it('should handle radio group element with getValueOptions', () => {
      const radioGroup = new Element();
      radioGroup.setName('color');
      radioGroup.setAttribute('type', 'radio');
      radioGroup.getValueOptions = jest.fn().mockReturnValue(['red', 'blue']);
      form.add(radioGroup);
      form.populateValues({ color: 'red' });
      expect(radioGroup.getValue()).toBe('red');
    });

    it('should extract radio value when checked', () => {
      const radio = new Element();
      radio.setName('gender');
      radio.setAttribute('type', 'radio');
      radio.setAttribute('checked', 'checked');
      radio.setAttribute('value', 'male');
      form.add(radio);
      const values = form.getValues();
      expect(values.gender).toBe('male');
    });

    it('should extract radio group value', () => {
      const radioGroup = new Element();
      radioGroup.setName('color');
      radioGroup.setAttribute('type', 'radio');
      radioGroup.getValueOptions = jest.fn().mockReturnValue(['red', 'blue']);
      radioGroup.setValue('blue');
      form.add(radioGroup);
      const values = form.getValues();
      expect(values.color).toBe('blue');
    });

    it('should not extract radio group value when empty', () => {
      const radioGroup = new Element();
      radioGroup.setName('color');
      radioGroup.setAttribute('type', 'radio');
      radioGroup.getValueOptions = jest.fn().mockReturnValue([]);
      form.add(radioGroup);
      const values = form.getValues();
      expect(values.color).toBeUndefined();
    });
  });

  describe('select population', () => {
    it('should populate select element', () => {
      const select = new Element();
      select.setName('country');
      select.setAttribute('type', 'select');
      form.add(select);
      form.populateValues({ country: 'US' });
      expect(select.getValue()).toBe('US');
    });
  });

  describe('_populateElementValue error handling', () => {
    it('should handle errors in population gracefully with debug', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      const debugForm = new Form({ debug: true });
      const badElement = new Element();
      badElement.setName('bad');
      debugForm.add(badElement);
      // Override getAttribute AFTER add() so getName() worked during add
      const originalGetAttribute = badElement.getAttribute.bind(badElement);
      badElement.getAttribute = (key) => {
        if (key === 'type') throw new Error('boom');
        return originalGetAttribute(key);
      };
      // Should not throw - error is caught and logged
      debugForm.populateValues({ bad: 'value' });
      spy.mockRestore();
    });

    it('should handle error with fallback setValue call (lines 199-204)', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      const debugForm = new Form({ debug: true });
      const badElement = {
        getName: () => 'bad',
        getAttribute: () => { throw new Error('boom'); },
        setValue: jest.fn(),
      };
      debugForm.elements['bad'] = badElement;
      debugForm.populateValues({ bad: 'value' });
      expect(badElement.setValue).toHaveBeenCalledWith('value');
      spy.mockRestore();
    });

    it('should handle error when element has no setValue in fallback (lines 199-204)', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      const debugForm = new Form({ debug: true });
      const badElement = {
        getName: () => 'bad',
        getAttribute: () => { throw new Error('boom'); },
      };
      debugForm.elements['bad'] = badElement;
      expect(() => debugForm.populateValues({ bad: 'value' })).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('addAttribs inherited property skip (line 82)', () => {
    it('should skip inherited properties', () => {
      const parent = { inherited: 'skip' };
      const attribs = Object.create(parent);
      attribs.own = 'keep';
      form.addAttribs(attribs);
      expect(form.getAttrib('own')).toBe('keep');
      expect(form.getAttrib('inherited')).toBeNull();
    });
  });

  describe('populateValues with element not in data (line 160)', () => {
    it('should skip elements not present in data', () => {
      const el1 = new Text('name');
      const el2 = new Text('email');
      form.add(el1);
      form.add(el2);
      el2.setValue('original');
      form.populateValues({ name: 'Alice' });
      // email not in data, should remain unchanged
      expect(form.get('email').getValue()).toBe('original');
    });
  });

  describe('_populateElementValue with element without getAttribute (line 174)', () => {
    it('should treat elementType as null when no getAttribute', () => {
      const el = {
        getName: () => 'field',
        setValue: jest.fn(),
      };
      form.elements['field'] = el;
      form.populateValues({ field: 'value' });
      expect(el.setValue).toHaveBeenCalledWith('value');
    });
  });

  describe('_populateElementValue default case - element without setValue (lines 194-196)', () => {
    it('should not throw when element has no setValue in default branch', () => {
      const el = {
        getName: () => 'field',
        getAttribute: () => 'text', // not checkbox/radio/select
      };
      form.elements['field'] = el;
      expect(() => form.populateValues({ field: 'value' })).not.toThrow();
    });
  });

  describe('_populateCheckbox without setAttribute (line 213, 224)', () => {
    it('should not throw when checkbox element has no setAttribute (array value)', () => {
      const el = {
        getName: () => 'cb',
        getAttribute: (key) => {
          if (key === 'type') return 'checkbox';
          if (key === 'value') return 'red';
          return null;
        },
      };
      form.elements['cb'] = el;
      expect(() => form.populateValues({ cb: ['red'] })).not.toThrow();
    });

    it('should not throw when checkbox element has no setAttribute (scalar value)', () => {
      const el = {
        getName: () => 'cb',
        getAttribute: (key) => {
          if (key === 'type') return 'checkbox';
          if (key === 'value') return 'on';
          return null;
        },
      };
      form.elements['cb'] = el;
      expect(() => form.populateValues({ cb: true })).not.toThrow();
    });
  });

  describe('_populateRadio group without setValue (line 233)', () => {
    it('should not throw when radio group has no setValue', () => {
      const radioGroup = {
        getName: () => 'color',
        getAttribute: (key) => {
          if (key === 'type') return 'radio';
          return null;
        },
        getValueOptions: jest.fn().mockReturnValue(['red', 'blue']),
      };
      form.elements['color'] = radioGroup;
      expect(() => form.populateValues({ color: 'red' })).not.toThrow();
    });
  });

  describe('_populateRadio single radio without getAttribute (line 240 false branch)', () => {
    it('should use null elementValue when element has no getAttribute', () => {
      const el = {
        setAttribute: jest.fn(),
      };
      // Call _populateRadio directly to hit false branch on line 240
      form._populateRadio(el, 'someValue');
      // elementValue is null, String('someValue') !== String(null), so not checked
      expect(el.setAttribute).toHaveBeenCalledWith('checked', null);
    });
  });

  describe('_populateRadio single radio without getValueOptions (lines 240-244)', () => {
    it('should check single radio with matching value via setAttribute', () => {
      const el = new Element();
      el.setName('size');
      el.setAttribute('type', 'radio');
      el.setAttribute('value', 'large');
      form.add(el);
      form.populateValues({ size: 'large' });
      expect(el.getAttribute('checked')).toBe('checked');
    });

    it('should not throw when single radio has no setAttribute', () => {
      const el = {
        getName: () => 'size',
        getAttribute: (key) => {
          if (key === 'type') return 'radio';
          if (key === 'value') return 'large';
          return null;
        },
      };
      form.elements['size'] = el;
      expect(() => form.populateValues({ size: 'large' })).not.toThrow();
    });

    it('should handle single radio without getAttribute for value', () => {
      const el = {
        getName: () => 'size',
        getAttribute: (key) => {
          if (key === 'type') return 'radio';
          return null;
        },
        setAttribute: jest.fn(),
      };
      form.elements['size'] = el;
      form.populateValues({ size: 'large' });
      expect(el.setAttribute).toHaveBeenCalledWith('checked', null);
    });
  });

  describe('_populateSelect without setValue (line 248-250)', () => {
    it('should not throw when select element has no setValue', () => {
      const el = {
        getName: () => 'country',
        getAttribute: (key) => {
          if (key === 'type') return 'select';
          return null;
        },
      };
      form.elements['country'] = el;
      expect(() => form.populateValues({ country: 'US' })).not.toThrow();
    });
  });

  describe('getValues with various element types (lines 262-272)', () => {
    it('should handle element without getAttribute', () => {
      const el = {
        getName: () => 'field',
        getValue: () => 'val',
      };
      form.elements['field'] = el;
      const values = form.getValues();
      expect(values.field).toBe('val');
    });

    it('should handle element without getValue', () => {
      const el = {
        getName: () => 'field',
        getAttribute: () => null,
      };
      form.elements['field'] = el;
      const values = form.getValues();
      expect(values.field).toBeUndefined();
    });
  });

  describe('_extractCheckboxValue duplicate name coercion (line 285)', () => {
    it('should coerce existing non-array value to array when adding second checkbox value', () => {
      const values = { colors: 'red' };
      const cb = new Element();
      cb.setName('colors');
      cb.setAttribute('type', 'checkbox');
      cb.setAttribute('checked', 'checked');
      cb.setAttribute('value', 'blue');
      form._extractCheckboxValue(cb, 'colors', values);
      expect(values.colors).toEqual(['red', 'blue']);
    });

    it('should push to existing array when values[name] is already an array (line 285 false branch)', () => {
      const values = { colors: ['red'] };
      const cb = new Element();
      cb.setName('colors');
      cb.setAttribute('type', 'checkbox');
      cb.setAttribute('checked', 'checked');
      cb.setAttribute('value', 'green');
      form._extractCheckboxValue(cb, 'colors', values);
      expect(values.colors).toEqual(['red', 'green']);
    });

    it('should handle checkbox without getAttribute for value (uses "on" default)', () => {
      const values = {};
      const cb = {
        getAttribute: (key) => {
          if (key === 'checked') return 'checked';
          return null; // no value attribute
        },
      };
      form._extractCheckboxValue(cb, 'agree', values);
      expect(values.agree).toBe('on');
    });

    it('should return early when checkbox is not checked', () => {
      const values = {};
      const cb = {
        getAttribute: () => null,
      };
      form._extractCheckboxValue(cb, 'agree', values);
      expect(values.agree).toBeUndefined();
    });

    it('should return early when element has no getAttribute', () => {
      const values = {};
      form._extractCheckboxValue({}, 'agree', values);
      expect(values.agree).toBeUndefined();
    });
  });

  describe('_extractRadioValue branches (lines 296, 304-310)', () => {
    it('should skip radio group value when getValue returns null', () => {
      const radioGroup = {
        getValueOptions: jest.fn().mockReturnValue([]),
        getValue: jest.fn().mockReturnValue(null),
        getAttribute: () => 'radio',
      };
      const values = {};
      form._extractRadioValue(radioGroup, 'color', values);
      expect(values.color).toBeUndefined();
    });

    it('should skip radio group value when getValue returns empty string', () => {
      const radioGroup = {
        getValueOptions: jest.fn().mockReturnValue([]),
        getValue: jest.fn().mockReturnValue(''),
        getAttribute: () => 'radio',
      };
      const values = {};
      form._extractRadioValue(radioGroup, 'color', values);
      expect(values.color).toBeUndefined();
    });

    it('should extract single radio value when checked', () => {
      const radio = {
        getAttribute: (key) => {
          if (key === 'checked') return 'checked';
          if (key === 'value') return 'male';
          return null;
        },
      };
      const values = {};
      form._extractRadioValue(radio, 'gender', values);
      expect(values.gender).toBe('male');
    });

    it('should skip single radio when not checked', () => {
      const radio = {
        getAttribute: (key) => {
          if (key === 'checked') return null;
          if (key === 'value') return 'male';
          return null;
        },
      };
      const values = {};
      form._extractRadioValue(radio, 'gender', values);
      expect(values.gender).toBeUndefined();
    });

    it('should handle single radio without getAttribute', () => {
      const radio = {};
      const values = {};
      form._extractRadioValue(radio, 'gender', values);
      expect(values.gender).toBeUndefined();
    });

    it('should use null for radio group without getValue (line 296 false branch)', () => {
      const radioGroup = {
        getValueOptions: jest.fn().mockReturnValue(['a', 'b']),
        // no getValue method
      };
      const values = {};
      form._extractRadioValue(radioGroup, 'color', values);
      // selectedValue will be null, which is skipped
      expect(values.color).toBeUndefined();
    });

    it('should use null for checked single radio without getAttribute (line 305 false branch)', () => {
      // This simulates a checked radio where getAttribute is not a function
      // for the value check on line 305
      let callCount = 0;
      const radio = {
        getAttribute: (key) => {
          if (key === 'checked') return 'checked';
          // after checking 'checked', next call is for 'value' - return null
          return null;
        },
      };
      const values = {};
      form._extractRadioValue(radio, 'gender', values);
      // value will be null from getAttribute('value')
      expect(values.gender).toBeNull();
    });
  });

  describe('_extractDefaultValue when value is empty/null (line 310)', () => {
    it('should skip when getValue returns null', () => {
      const el = { getValue: () => null };
      const values = {};
      form._extractDefaultValue(el, 'field', values);
      expect(values.field).toBeUndefined();
    });

    it('should skip when getValue returns empty string', () => {
      const el = { getValue: () => '' };
      const values = {};
      form._extractDefaultValue(el, 'field', values);
      expect(values.field).toBeUndefined();
    });

    it('should skip when getValue returns undefined', () => {
      const el = { getValue: () => undefined };
      const values = {};
      form._extractDefaultValue(el, 'field', values);
      expect(values.field).toBeUndefined();
    });
  });

  describe('reset with elements without getAttribute/setAttribute (lines 370, 375-378)', () => {
    it('should handle element without getAttribute in reset', () => {
      const el = {
        getName: () => 'field',
        setValue: jest.fn(),
      };
      form.elements['field'] = el;
      form.reset();
      expect(el.setValue).toHaveBeenCalledWith('');
    });

    it('should handle checkbox without setAttribute in reset', () => {
      const el = {
        getName: () => 'cb',
        getAttribute: (key) => {
          if (key === 'type') return 'checkbox';
          return null;
        },
      };
      form.elements['cb'] = el;
      expect(() => form.reset()).not.toThrow();
    });

    it('should handle radio without setAttribute in reset', () => {
      const el = {
        getName: () => 'rd',
        getAttribute: (key) => {
          if (key === 'type') return 'radio';
          return null;
        },
      };
      form.elements['rd'] = el;
      expect(() => form.reset()).not.toThrow();
    });

    it('should handle element without setValue in reset default branch', () => {
      const el = {
        getName: () => 'field',
        getAttribute: () => 'text',
      };
      form.elements['field'] = el;
      expect(() => form.reset()).not.toThrow();
    });
  });

  describe('_populateCheckbox with element without getAttribute for value (line 209)', () => {
    it('should use "on" as default when getAttribute is not a function for checkbox value', () => {
      const el = {
        getName: () => 'cb',
        getAttribute: (key) => {
          if (key === 'type') return 'checkbox';
          // No 'value' attribute returns null
          return null;
        },
        setAttribute: jest.fn(),
      };
      form.elements['cb'] = el;
      form.populateValues({ cb: 'on' });
      expect(el.setAttribute).toHaveBeenCalledWith('checked', 'checked');
    });
  });
});
