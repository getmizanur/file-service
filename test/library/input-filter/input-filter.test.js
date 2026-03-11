const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');

// Set up global.applicationPath before requiring InputFilter
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const InputFilter = require(path.join(projectRoot, 'library/input-filter/input-filter'));
const Input = require(path.join(projectRoot, 'library/input-filter/input'));

describe('InputFilter', () => {

  // Suppress console.log from validators
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
  });

  describe('add / get', () => {
    it('should add and retrieve an input by name', () => {
      const filter = new InputFilter();
      const input = new Input('email');
      filter.add(input);
      expect(filter.get('email')).toBe(input);
    });

    it('should return undefined for non-existent input', () => {
      const filter = new InputFilter();
      expect(filter.get('missing')).toBeUndefined();
    });
  });

  describe('getValue / getRawValue', () => {
    it('should return the value of a named input', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setValue('John');
      filter.add(input);
      expect(filter.getValue('name')).toBe('John');
    });

    it('should return undefined for non-existent input getValue', () => {
      const filter = new InputFilter();
      expect(filter.getValue('missing')).toBeUndefined();
    });

    it('should return raw value from data', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData({ name: '  John  ' });
      expect(filter.getRawValue('name')).toBe('  John  ');
    });

    it('should return null for non-existent raw value', () => {
      const filter = new InputFilter();
      expect(filter.getRawValue('missing')).toBeNull();
    });
  });

  describe('getValues / getRawValues', () => {
    it('should return all filtered values', () => {
      const filter = new InputFilter();
      const input1 = new Input('first');
      const input2 = new Input('last');
      input1.setValue('Jane');
      input2.setValue('Doe');
      filter.add(input1);
      filter.add(input2);
      expect(filter.getValues()).toEqual({ first: 'Jane', last: 'Doe' });
    });

    it('should return raw data', () => {
      const filter = new InputFilter();
      const data = { first: 'Jane', last: 'Doe' };
      filter.data = data;
      expect(filter.getRawValues()).toBe(data);
    });
  });

  describe('setData / populate', () => {
    it('should populate inputs with data', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData({ name: 'Alice' });
      expect(filter.getValue('name')).toBe('Alice');
    });

    it('should set null for inputs not in data', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData({});
      expect(filter.getValue('name')).toBeNull();
    });

    it('should apply filters in order', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      const mockFilter = { filter: jest.fn((val) => val.trim()) };
      input.setFilters(mockFilter);
      filter.add(input);
      filter.setData({ name: '  Alice  ' });
      expect(filter.getValue('name')).toBe('Alice');
    });

    it('should handle null data gracefully', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData(null);
      expect(filter.getValue('name')).toBeNull();
    });
  });

  describe('isValid', () => {
    it('should return true when all inputs are valid', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData({});
      expect(filter.isValid()).toBe(true);
    });

    it('should return false when an input is invalid', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(true);
      filter.add(input);
      filter.setData({});
      expect(filter.isValid()).toBe(false);
    });

    it('should track invalid inputs', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(true);
      filter.add(input);
      filter.setData({});
      filter.isValid();
      const invalidInputs = filter.getInvalidInputs();
      expect(invalidInputs.name).toBe(input);
    });

    it('should reset invalid inputs on each call', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(true);
      filter.add(input);
      filter.setData({});
      filter.isValid();
      expect(Object.keys(filter.getInvalidInputs()).length).toBe(1);
      // Now set valid data
      filter.setData({ name: 'John' });
      filter.isValid();
      expect(Object.keys(filter.getInvalidInputs()).length).toBe(0);
    });

    it('should accept custom context', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData({});
      expect(filter.isValid({ custom: 'context' })).toBe(true);
    });
  });

  describe('getMessages', () => {
    it('should return messages from invalid inputs', () => {
      const filter = new InputFilter();
      const input = new Input('email');
      input.setRequired(true);
      filter.add(input);
      filter.setData({});
      filter.isValid();
      const messages = filter.getMessages();
      expect(messages.email).toBeDefined();
      expect(messages.email.length).toBeGreaterThan(0);
    });

    it('should return empty object when all valid', () => {
      const filter = new InputFilter();
      const input = new Input('name');
      input.setRequired(false);
      filter.add(input);
      filter.setData({});
      filter.isValid();
      expect(filter.getMessages()).toEqual({});
    });

    it('should skip invalid inputs without getMessages function (branch line 93)', () => {
      const filter = new InputFilter();
      const input = new Input('email');
      input.setRequired(true);
      filter.add(input);
      filter.setData({});
      filter.isValid();
      // Replace the invalid input with one that lacks getMessages
      filter.invalidInputs.email = { noGetMessages: true };
      const messages = filter.getMessages();
      expect(messages.email).toBeUndefined();
    });
  });

  describe('factory', () => {
    it('should create an InputFilter from config', () => {
      const config = {
        email: {
          required: true,
          validators: [
            { name: 'EmailAddress' }
          ]
        }
      };
      const f = InputFilter.factory(config);
      expect(f.get('email')).toBeDefined();
    });

    it('should apply filters from config', () => {
      const config = {
        name: {
          required: false,
          filters: [
            { name: 'StringTrim' }
          ]
        }
      };
      const f = InputFilter.factory(config);
      f.setData({ name: '  hello  ' });
      expect(f.getValue('name')).toBe('hello');
    });

    it('should apply validators with options', () => {
      const config = {
        title: {
          required: true,
          validators: [
            { name: 'StringLength', options: { min: 3, max: 100 } }
          ]
        }
      };
      const f = InputFilter.factory(config);
      f.setData({ title: 'Hi' });
      expect(f.isValid()).toBe(false);
    });

    it('should apply custom messages to validators', () => {
      const config = {
        email: {
          required: true,
          validators: [
            { name: 'EmailAddress', messages: { INVALID_FORMAT: 'Bad email' } }
          ]
        }
      };
      const f = InputFilter.factory(config);
      f.setData({ email: 'not-an-email' });
      f.isValid();
      const messages = f.getMessages();
      expect(messages.email).toContain('Bad email');
    });

    it('should handle allow_empty and continue_if_empty flags', () => {
      const config = {
        notes: {
          required: false,
          allow_empty: true,
          continue_if_empty: false
        }
      };
      const f = InputFilter.factory(config);
      f.setData({ notes: '' });
      expect(f.isValid()).toBe(true);
    });

    it('should handle camelCase allowEmpty and continueIfEmpty flags', () => {
      const config = {
        notes: {
          required: false,
          allowEmpty: true,
          continueIfEmpty: false
        }
      };
      const f = InputFilter.factory(config);
      f.setData({ notes: '' });
      expect(f.isValid()).toBe(true);
    });

    it('should handle requiredMessage', () => {
      const config = {
        email: {
          required: true,
          requiredMessage: 'Email is mandatory'
        }
      };
      const f = InputFilter.factory(config);
      f.setData({});
      f.isValid();
      const messages = f.getMessages();
      expect(messages.email).toContain('Email is mandatory');
    });

    it('should handle empty spec gracefully', () => {
      const config = { field: {} };
      const f = InputFilter.factory(config);
      expect(f.get('field')).toBeDefined();
    });

    it('should handle null/undefined spec values (branch line 138)', () => {
      const config = { field: null };
      const f = InputFilter.factory(config);
      expect(f.get('field')).toBeDefined();
    });

    it('should handle invalid filter names gracefully', () => {
      const config = {
        name: {
          filters: [{ name: 'NonExistentFilter' }]
        }
      };
      // Should not throw
      expect(() => InputFilter.factory(config)).not.toThrow();
    });

    it('should handle invalid validator names gracefully', () => {
      const config = {
        name: {
          validators: [{ name: 'NonExistentValidator' }]
        }
      };
      expect(() => InputFilter.factory(config)).not.toThrow();
    });

    it('should skip filters with empty or non-string names', () => {
      const config = {
        name: {
          filters: [{ name: '' }, { name: null }, {}]
        }
      };
      expect(() => InputFilter.factory(config)).not.toThrow();
    });

    it('should skip validators with empty or non-string names', () => {
      const config = {
        name: {
          validators: [{ name: '' }, { name: null }, {}]
        }
      };
      expect(() => InputFilter.factory(config)).not.toThrow();
    });
  });

  describe('_toKebabFileName', () => {
    it('should convert PascalCase to kebab-case', () => {
      expect(InputFilter._toKebabFileName('StringTrim')).toBe('string-trim');
      expect(InputFilter._toKebabFileName('HtmlEntities')).toBe('html-entities');
      expect(InputFilter._toKebabFileName('EmailAddress')).toBe('email-address');
    });
  });

  describe('_applyBoolFlag', () => {
    it('should apply snake_case bool value', () => {
      const input = new Input('test');
      InputFilter._applyBoolFlag(input, 'AllowEmpty', true, undefined);
      expect(input.getAllowEmpty()).toBe(true);
    });

    it('should apply camelCase bool value when snake is not bool', () => {
      const input = new Input('test');
      InputFilter._applyBoolFlag(input, 'AllowEmpty', undefined, true);
      expect(input.getAllowEmpty()).toBe(true);
    });

    it('should do nothing when neither value is boolean', () => {
      const input = new Input('test');
      InputFilter._applyBoolFlag(input, 'AllowEmpty', undefined, undefined);
      expect(input.getAllowEmpty()).toBe(false);
    });

    it('should fall back to property assignment when setter does not exist', () => {
      const input = new Input('test');
      InputFilter._applyBoolFlag(input, 'CustomFlag', true, undefined);
      expect(input.customFlag).toBe(true);
    });
  });

  describe('_applyValidatorMessages', () => {
    it('should call setMessage on the validator when available', () => {
      const obj = { setMessage: jest.fn() };
      InputFilter._applyValidatorMessages(obj, { INVALID: 'Custom' });
      expect(obj.setMessage).toHaveBeenCalledWith('Custom', 'INVALID');
    });

    it('should set message property directly when setMessage is not available', () => {
      const obj = { message: null };
      InputFilter._applyValidatorMessages(obj, { INVALID: 'Custom' });
      expect(obj.message).toBe('Custom');
    });

    it('should do nothing when messages is not an object', () => {
      const obj = { setMessage: jest.fn() };
      InputFilter._applyValidatorMessages(obj, null);
      expect(obj.setMessage).not.toHaveBeenCalled();
    });
  });

  describe('_applyFilters branches', () => {
    it('should handle null filter entry in array (branch line 188)', () => {
      const input = new Input('test');
      expect(() => InputFilter._applyFilters(input, [null])).not.toThrow();
    });

    it('should apply a valid filter with obj.filter function (line 193)', () => {
      const input = new Input('test');
      // StringTrim is a real filter that has a filter() method
      InputFilter._applyFilters(input, [{ name: 'StringTrim' }]);
      // Verify filter was added
      expect(input.getFilters().length).toBeGreaterThan(0);
    });

    it('should handle non-existent filter name gracefully', () => {
      const input = new Input('test');
      expect(() => InputFilter._applyFilters(input, [{ name: 'NonExistent' }])).not.toThrow();
    });

    // Line 193 FALSE branch: filter instance has no filter() method
    it('should not add filter when obj has no filter function (line 193 false branch)', () => {
      const input = new Input('test');
      const initialCount = input.getFilters().length;
      const originalFn = InputFilter._toKebabFileName;
      // Monkey-patch to return a name that resolves to a module whose class has no filter() method
      // We temporarily create such a module via jest.mock
      const stubPath = path.join(projectRoot, 'library/input-filter/filters/string-trim');
      const RealStringTrim = require(stubPath);
      const origFilter = RealStringTrim.prototype.filter;
      delete RealStringTrim.prototype.filter;
      InputFilter._applyFilters(input, [{ name: 'StringTrim' }]);
      RealStringTrim.prototype.filter = origFilter;
      // The false branch: setFilters not called, so count unchanged
      expect(input.getFilters().length).toBe(initialCount);
    });
  });

  describe('_applyValidators branches', () => {
    it('should handle null validator entry in array (branch line 207)', () => {
      const input = new Input('test');
      expect(() => InputFilter._applyValidators(input, [null])).not.toThrow();
    });

    it('should apply a valid validator with obj.isValid function (line 213)', () => {
      const input = new Input('test');
      // Regex is a real validator that has an isValid() method
      InputFilter._applyValidators(input, [{ name: 'Regex', options: { pattern: /^[a-z]+$/ } }]);
      // Verify validator was added
      expect(input.getValidators().length).toBeGreaterThan(0);
    });

    it('should handle non-existent validator name gracefully', () => {
      const input = new Input('test');
      expect(() => InputFilter._applyValidators(input, [{ name: 'NonExistent' }])).not.toThrow();
    });

    // Line 213 FALSE branch: validator instance has no isValid() method
    it('should not add validator when obj has no isValid function (line 213 false branch)', () => {
      const input = new Input('test');
      const initialCount = input.getValidators().length;
      // Temporarily shadow isValid with a non-function to trigger the false branch
      const stubPath = path.join(projectRoot, 'library/input-filter/validators/regex');
      const RealRegex = require(stubPath);
      const origIsValid = RealRegex.prototype.isValid;
      RealRegex.prototype.isValid = null; // shadow inherited method with non-function
      InputFilter._applyValidators(input, [{ name: 'Regex' }]);
      RealRegex.prototype.isValid = origIsValid;
      // The false branch: setValidators not called, so count unchanged
      expect(input.getValidators().length).toBe(initialCount);
    });
  });

});
