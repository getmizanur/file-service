const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const Input = require(path.join(projectRoot, 'library/input-filter/input'));

describe('Input', () => {

  // Suppress console.log from the Input class
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const input = new Input('email');
      expect(input.getName()).toBe('email');
      expect(input.isRequired()).toBe(true);
      expect(input.getValue()).toBeNull();
      expect(input.getAllowEmpty()).toBe(false);
      expect(input.getContinueIfEmpty()).toBe(false);
      expect(input.getHasValue()).toBe(false);
      expect(input.getValidators()).toEqual([]);
      expect(input.getFilters()).toEqual([]);
      expect(input.getMessages()).toEqual([]);
    });

    it('should default name to null', () => {
      const input = new Input();
      expect(input.getName()).toBeNull();
    });
  });

  describe('setValue / getValue', () => {
    it('should set and get value', () => {
      const input = new Input('test');
      input.setValue('hello');
      expect(input.getValue()).toBe('hello');
      expect(input.getHasValue()).toBe(true);
    });

    it('should set hasValue to false for null', () => {
      const input = new Input('test');
      input.setValue(null);
      expect(input.getHasValue()).toBe(false);
    });

    it('should set hasValue to false for empty string', () => {
      const input = new Input('test');
      input.setValue('');
      expect(input.getHasValue()).toBe(false);
    });

    it('should set rawValue on first setValue call', () => {
      const input = new Input('test');
      input.setValue('raw');
      expect(input.getRawValue()).toBe('raw');
    });

    it('should clear previous value and rawValue on each setValue', () => {
      const input = new Input('test');
      input.setValue('first');
      input.setValue('second');
      expect(input.getValue()).toBe('second');
      expect(input.getRawValue()).toBe('second');
    });
  });

  describe('setRawValue / getRawValue', () => {
    it('should set and get raw value', () => {
      const input = new Input('test');
      input.setRawValue('raw');
      expect(input.getRawValue()).toBe('raw');
    });
  });

  describe('clearValue / clearRawValue', () => {
    it('should clear value and hasValue flag', () => {
      const input = new Input('test');
      input.setValue('hello');
      input.clearValue();
      expect(input.getValue()).toBeNull();
      expect(input.getHasValue()).toBe(false);
    });

    it('should clear raw value', () => {
      const input = new Input('test');
      input.setRawValue('raw');
      input.clearRawValue();
      expect(input.getRawValue()).toBeNull();
    });
  });

  describe('validators and filters', () => {
    it('should add validators', () => {
      const input = new Input('test');
      const mockValidator = { isValid: jest.fn() };
      input.setValidators(mockValidator);
      expect(input.getValidators()).toHaveLength(1);
    });

    it('should add filters', () => {
      const input = new Input('test');
      const mockFilter = { filter: jest.fn() };
      input.setFilters(mockFilter);
      expect(input.getFilters()).toHaveLength(1);
    });
  });

  describe('required / allowEmpty / continueIfEmpty', () => {
    it('should set and check required', () => {
      const input = new Input('test');
      input.setRequired(false);
      expect(input.isRequired()).toBe(false);
    });

    it('should set and get allowEmpty', () => {
      const input = new Input('test');
      input.setAllowEmpty(true);
      expect(input.getAllowEmpty()).toBe(true);
    });

    it('should set and get continueIfEmpty', () => {
      const input = new Input('test');
      input.setContinueIfEmpty(true);
      expect(input.getContinueIfEmpty()).toBe(true);
    });
  });

  describe('setRequiredMessage', () => {
    it('should set custom required message and return this', () => {
      const input = new Input('test');
      const result = input.setRequiredMessage('This field is mandatory');
      expect(input.customRequiredMessage).toBe('This field is mandatory');
      expect(result).toBe(input);
    });
  });

  describe('isValid', () => {
    it('should return true when not required and no value', () => {
      const input = new Input('test');
      input.setRequired(false);
      expect(input.isValid()).toBe(true);
    });

    it('should return false when required and no value', () => {
      const input = new Input('test');
      input.setRequired(true);
      expect(input.isValid()).toBe(false);
      expect(input.getMessages().length).toBeGreaterThan(0);
    });

    it('should use custom required message when set', () => {
      const input = new Input('test');
      input.setRequired(true);
      input.setRequiredMessage('Email is required');
      input.isValid();
      expect(input.getMessages()).toContain('Email is required');
    });

    it('should use default required message when custom not set', () => {
      const input = new Input('test');
      input.setRequired(true);
      input.isValid();
      expect(input.getMessages()).toContain('Required, non-empty field');
    });

    it('should return true when empty, not required, and not continueIfEmpty', () => {
      const input = new Input('test');
      input.setRequired(false);
      input.setValue('');
      // hasValue is false for empty string, so it goes to !hasValue && !required
      expect(input.isValid()).toBe(true);
    });

    it('should return true when empty, allowEmpty, and not continueIfEmpty', () => {
      const input = new Input('test');
      input.setRequired(false);
      input.setAllowEmpty(true);
      input.setContinueIfEmpty(false);
      // setValue to empty string, but need hasValue = true to reach the allowEmpty branch
      // Actually with empty string hasValue is false, so it returns at !hasValue && !required
      expect(input.isValid()).toBe(true);
    });

    it('should return true when hasValue=true, value empty, not required, not continueIfEmpty (line 131-133)', () => {
      const input = new Input('test');
      input.setRequired(false);
      input.setContinueIfEmpty(false);
      // Directly set internal state: hasValue=true with empty value
      input.value = null;
      input.hasValue = true;
      expect(input.isValid()).toBe(true);
    });

    it('should return true when hasValue=true, value empty, required, allowEmpty, not continueIfEmpty (line 136-138)', () => {
      const input = new Input('test');
      input.setRequired(true);
      input.setAllowEmpty(true);
      input.setContinueIfEmpty(false);
      // Directly set internal state: hasValue=true with empty value
      input.value = null;
      input.hasValue = true;
      expect(input.isValid()).toBe(true);
    });

    it('should run validators and return true when all pass', () => {
      const input = new Input('test');
      input.setValue('valid');
      const mockValidator = { isValid: jest.fn().mockReturnValue(true), message: null };
      input.setValidators(mockValidator);
      expect(input.isValid()).toBe(true);
      expect(mockValidator.isValid).toHaveBeenCalledWith('valid', null);
    });

    it('should run validators and return false when one fails', () => {
      const input = new Input('test');
      input.setValue('invalid');
      const mockValidator = { isValid: jest.fn().mockReturnValue(false), message: 'Validation failed' };
      input.setValidators(mockValidator);
      expect(input.isValid()).toBe(false);
      expect(input.getMessages()).toContain('Validation failed');
    });

    it('should pass context to validators', () => {
      const input = new Input('test');
      input.setValue('value');
      const mockValidator = { isValid: jest.fn().mockReturnValue(true), message: null };
      input.setValidators(mockValidator);
      const context = { other: 'data' };
      input.isValid(context);
      expect(mockValidator.isValid).toHaveBeenCalledWith('value', context);
    });

    it('should collect messages from multiple failing validators', () => {
      const input = new Input('test');
      input.setValue('bad');
      const v1 = { isValid: jest.fn().mockReturnValue(false), message: 'Error 1' };
      const v2 = { isValid: jest.fn().mockReturnValue(false), message: 'Error 2' };
      input.setValidators(v1);
      input.setValidators(v2);
      input.isValid();
      expect(input.getMessages()).toContain('Error 1');
      expect(input.getMessages()).toContain('Error 2');
    });
  });

  describe('setErrorMessage / getMessages', () => {
    it('should accumulate error messages', () => {
      const input = new Input('test');
      input.setErrorMessage('Error 1');
      input.setErrorMessage('Error 2');
      expect(input.getMessages()).toEqual(['Error 1', 'Error 2']);
    });
  });

});
