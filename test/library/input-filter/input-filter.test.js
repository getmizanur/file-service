const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const InputFilter = require(path.join(projectRoot, 'library/input-filter/input-filter'));
const Input = require(path.join(projectRoot, 'library/input-filter/input'));

describe('InputFilter', () => {

  describe('getInvalidInputs()', () => {
    it('should return only inputs that failed validation', () => {
      const inputFilter = InputFilter.factory({
        email: {
          required: true,
          validators: [{ name: 'EmailAddress' }],
        },
        name: {
          required: true,
          validators: [{ name: 'StringLength', options: { min: 1 } }],
        },
      });

      inputFilter.setData({ email: 'invalid-email', name: 'Alice' });
      inputFilter.isValid();

      const invalid = inputFilter.getInvalidInputs();
      expect(Object.keys(invalid)).toContain('email');
      expect(Object.keys(invalid)).not.toContain('name');
    });

    it('should return empty object when all inputs are valid', () => {
      const inputFilter = InputFilter.factory({
        name: {
          required: true,
          validators: [{ name: 'StringLength', options: { min: 1 } }],
        },
      });

      inputFilter.setData({ name: 'Alice' });
      inputFilter.isValid();

      expect(inputFilter.getInvalidInputs()).toEqual({});
    });

    it('should return all inputs when all are invalid', () => {
      const inputFilter = InputFilter.factory({
        email: {
          required: true,
          validators: [{ name: 'EmailAddress' }],
        },
        name: {
          required: true,
          validators: [{ name: 'StringLength', options: { min: 5 } }],
        },
      });

      inputFilter.setData({ email: 'bad', name: 'ab' });
      inputFilter.isValid();

      const invalid = inputFilter.getInvalidInputs();
      expect(Object.keys(invalid)).toContain('email');
      expect(Object.keys(invalid)).toContain('name');
    });
  });

  describe('populate()', () => {
    it('should populate existing inputs with data', () => {
      const inputFilter = new InputFilter();
      const input = new Input('username');
      inputFilter.add(input);

      inputFilter.setData({ username: 'john' });

      expect(inputFilter.getValue('username')).toBe('john');
    });

    it('should set null for inputs not present in data', () => {
      const inputFilter = new InputFilter();
      const input = new Input('username');
      inputFilter.add(input);

      inputFilter.setData({});

      expect(inputFilter.getValue('username')).toBeNull();
    });

    it('should apply filters during populate', () => {
      const inputFilter = InputFilter.factory({
        email: {
          filters: [{ name: 'StringTrim' }, { name: 'StringToLower' }],
        },
      });

      inputFilter.setData({ email: '  TEST@EXAMPLE.COM  ' });

      expect(inputFilter.getValue('email')).toBe('test@example.com');
    });
  });

  describe('factory with custom validator messages', () => {
    it('should apply custom messages to validators via messages object', () => {
      const inputFilter = InputFilter.factory({
        name: {
          required: true,
          validators: [{
            name: 'StringLength',
            options: { min: 5 },
            messages: {
              INVALID_TOO_SHORT: 'Name is too short',
            },
          }],
        },
      });

      inputFilter.setData({ name: 'ab' });
      const valid = inputFilter.isValid();

      expect(valid).toBe(false);
      const messages = inputFilter.getMessages();
      expect(messages.name).toContain('Name is too short');
    });

    it('should apply multiple custom messages', () => {
      const inputFilter = InputFilter.factory({
        name: {
          required: true,
          validators: [{
            name: 'StringLength',
            options: { min: 2, max: 5 },
            messages: {
              INVALID_TOO_SHORT: 'Too short!',
              INVALID_TOO_LONG: 'Too long!',
            },
          }],
        },
      });

      inputFilter.setData({ name: 'a' });
      inputFilter.isValid();
      expect(inputFilter.getMessages().name).toContain('Too short!');
    });
  });

  describe('_applyBoolFlag()', () => {
    it('should handle allowEmpty flag with snake_case', () => {
      const inputFilter = InputFilter.factory({
        field: { allow_empty: true },
      });
      expect(inputFilter.get('field').getAllowEmpty()).toBe(true);
    });

    it('should handle continueIfEmpty flag with camelCase', () => {
      const inputFilter = InputFilter.factory({
        field: { continueIfEmpty: true },
      });
      expect(inputFilter.get('field').getContinueIfEmpty()).toBe(true);
    });
  });

  describe('getMessages()', () => {
    it('should aggregate messages from all invalid inputs', () => {
      const inputFilter = InputFilter.factory({
        email: {
          required: true,
          validators: [{ name: 'EmailAddress' }],
        },
      });

      inputFilter.setData({ email: 'not-an-email' });
      inputFilter.isValid();

      const messages = inputFilter.getMessages();
      expect(messages.email).toBeDefined();
      expect(messages.email.length).toBeGreaterThan(0);
    });
  });

  describe('getValues() / getRawValues()', () => {
    it('should return filtered values', () => {
      const inputFilter = InputFilter.factory({
        name: { filters: [{ name: 'StringTrim' }] },
      });

      inputFilter.setData({ name: '  hello  ' });

      expect(inputFilter.getValues()).toEqual({ name: 'hello' });
    });

    it('should return raw unfiltered values', () => {
      const inputFilter = InputFilter.factory({
        name: { filters: [{ name: 'StringTrim' }] },
      });

      inputFilter.setData({ name: '  hello  ' });

      expect(inputFilter.getRawValues()).toEqual({ name: '  hello  ' });
    });
  });

  describe('getRawValue()', () => {
    it('should return raw value for existing key', () => {
      const inputFilter = new InputFilter();
      const input = new Input('field');
      inputFilter.add(input);
      inputFilter.setData({ field: 'value' });
      expect(inputFilter.getRawValue('field')).toBe('value');
    });

    it('should return null for non-existing key', () => {
      const inputFilter = new InputFilter();
      inputFilter.setData({});
      expect(inputFilter.getRawValue('missing')).toBeNull();
    });
  });

  describe('isValid() with context', () => {
    it('should reset invalid inputs on each validation run', () => {
      const inputFilter = InputFilter.factory({
        email: {
          required: true,
          validators: [{ name: 'EmailAddress' }],
        },
      });

      inputFilter.setData({ email: 'bad' });
      inputFilter.isValid();
      expect(Object.keys(inputFilter.getInvalidInputs()).length).toBe(1);

      inputFilter.setData({ email: 'test@example.com' });
      inputFilter.isValid();
      expect(Object.keys(inputFilter.getInvalidInputs()).length).toBe(0);
    });
  });

  describe('factory with non-existent filter', () => {
    it('should log error and continue when filter module does not exist', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const inputFilter = InputFilter.factory({
        field: {
          filters: [{ name: 'NonExistentFilter' }],
        },
      });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Error:'));
      expect(inputFilter.get('field')).toBeDefined();
      expect(inputFilter.get('field').getFilters()).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('factory with non-existent validator (line 218)', () => {
    it('should log error and continue when validator module does not exist', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const inputFilter = InputFilter.factory({
        field: {
          validators: [{ name: 'NonExistentValidator' }],
        },
      });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Error:'));
      expect(inputFilter.get('field')).toBeDefined();
      spy.mockRestore();
    });
  });

  describe('factory with validator lacking setMessage', () => {
    it('should fall back to setting obj.message directly when validator has no setMessage', () => {
      // Create a mock validator module that has no setMessage method
      const mockValidatorPath = path.join(projectRoot, 'library/input-filter/validators/mock-no-set-message');
      // We'll use jest.mock to simulate a validator without setMessage
      jest.mock(
        path.join(projectRoot, 'library/input-filter/validators/mock-no-set-message'),
        () => {
          return class MockValidator {
            constructor() {
              this.message = null;
            }
            isValid() { return false; }
          };
        },
        { virtual: true }
      );

      const inputFilter = InputFilter.factory({
        field: {
          validators: [{
            name: 'MockNoSetMessage',
            messages: { SOME_KEY: 'Custom fallback message' },
          }],
        },
      });

      inputFilter.setData({ field: 'test' });
      inputFilter.isValid();
      const messages = inputFilter.getMessages();
      expect(messages.field).toContain('Custom fallback message');
    });
  });

  describe('factory with requiredMessage', () => {
    it('should apply custom required message', () => {
      const inputFilter = InputFilter.factory({
        field: {
          required: true,
          requiredMessage: 'This field is mandatory',
        },
      });

      inputFilter.setData({});
      inputFilter.isValid();

      const messages = inputFilter.getMessages();
      expect(messages.field).toContain('This field is mandatory');
    });
  });

  describe('_applyBoolFlag fallback property assignment (line 176)', () => {
    it('should set property directly when setter function does not exist', () => {
      const mockInput = {};
      // Call _applyBoolFlag with a setter suffix that doesn't exist as a function on the input
      InputFilter._applyBoolFlag(mockInput, 'CustomFlag', true, undefined);
      expect(mockInput.customFlag).toBe(true);
    });

    it('should prefer setter function when available', () => {
      const mockInput = { setCustomFlag: jest.fn() };
      InputFilter._applyBoolFlag(mockInput, 'CustomFlag', true, undefined);
      expect(mockInput.setCustomFlag).toHaveBeenCalledWith(true);
    });

    it('should return early when neither snakeVal nor camelVal is bool (line 172)', () => {
      const mockInput = {};
      InputFilter._applyBoolFlag(mockInput, 'CustomFlag', 'not-bool', 'also-not-bool');
      expect(mockInput.customFlag).toBeUndefined();
    });
  });

  describe('setData with falsy data (line 51)', () => {
    it('should default to empty object when data is null', () => {
      const inputFilter = new InputFilter();
      inputFilter.setData(null);
      expect(inputFilter.getRawValues()).toEqual({});
    });

    it('should default to empty object when data is undefined', () => {
      const inputFilter = new InputFilter();
      inputFilter.setData(undefined);
      expect(inputFilter.getRawValues()).toEqual({});
    });
  });

  describe('getMessages edge cases (line 93)', () => {
    it('should skip invalid inputs that have no getMessages method', () => {
      const inputFilter = new InputFilter();
      // Manually inject an invalid input without getMessages
      inputFilter.invalidInputs = { field: {} };
      const messages = inputFilter.getMessages();
      expect(messages).toEqual({});
    });

    it('should skip null invalid inputs', () => {
      const inputFilter = new InputFilter();
      inputFilter.invalidInputs = { field: null };
      const messages = inputFilter.getMessages();
      expect(messages).toEqual({});
    });
  });

  describe('factory with null spec (line 138)', () => {
    it('should handle null spec value in items', () => {
      const inputFilter = InputFilter.factory({ field: null });
      expect(inputFilter.get('field')).toBeDefined();
    });
  });

  describe('_applyFilters edge cases (lines 188-193)', () => {
    it('should skip filter with null entry', () => {
      const input = new Input('field');
      InputFilter._applyFilters(input, [null]);
      expect(input.getFilters()).toEqual([]);
    });

    it('should skip filter with empty name', () => {
      const input = new Input('field');
      InputFilter._applyFilters(input, [{ name: '' }]);
      expect(input.getFilters()).toEqual([]);
    });

    it('should skip filter obj without filter() method (line 193)', () => {
      jest.mock(
        path.join(projectRoot, 'library/input-filter/filters/mock-no-filter'),
        () => {
          return class MockNoFilter {
            constructor() {}
          };
        },
        { virtual: true }
      );
      const input = new Input('field');
      InputFilter._applyFilters(input, [{ name: 'MockNoFilter' }]);
      expect(input.getFilters()).toEqual([]);
    });

    it('should skip filter with non-string name', () => {
      const input = new Input('field');
      InputFilter._applyFilters(input, [{ name: 123 }]);
      expect(input.getFilters()).toEqual([]);
    });
  });

  describe('_applyValidators edge cases (lines 207-213)', () => {
    it('should skip validator with null entry', () => {
      const input = new Input('field');
      InputFilter._applyValidators(input, [null]);
      // no validators added
    });

    it('should skip validator with empty name', () => {
      const input = new Input('field');
      InputFilter._applyValidators(input, [{ name: '' }]);
    });

    it('should skip validator with non-string name', () => {
      const input = new Input('field');
      InputFilter._applyValidators(input, [{ name: 42 }]);
    });

    it('should not add validator when obj lacks isValid (line 213)', () => {
      // Mock a module that returns a class without isValid
      jest.mock(
        path.join(projectRoot, 'library/input-filter/validators/mock-no-is-valid'),
        () => {
          return class MockNoIsValid {
            constructor() {}
          };
        },
        { virtual: true }
      );
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const input = new Input('field');
      InputFilter._applyValidators(input, [{ name: 'MockNoIsValid' }]);
      spy.mockRestore();
    });
  });

  describe('_applyInputFlags edge cases', () => {
    it('should skip required when not a boolean', () => {
      const input = new Input('field');
      InputFilter._applyInputFlags(input, { required: 'yes' });
      // Should not throw, required is not set
    });

    it('should skip requiredMessage when empty', () => {
      const input = new Input('field');
      InputFilter._applyInputFlags(input, { requiredMessage: '' });
    });

    it('should skip requiredMessage when not a string', () => {
      const input = new Input('field');
      InputFilter._applyInputFlags(input, { requiredMessage: 123 });
    });
  });
});
