const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Input = require(path.join(projectRoot, 'library/input-filter/input'));

describe('Input', () => {

  let input;

  beforeEach(() => {
    input = new Input('testField');
  });

  describe('constructor', () => {
    it('should set name', () => {
      expect(input.getName()).toBe('testField');
    });

    it('should default to required', () => {
      expect(input.isRequired()).toBe(true);
    });

    it('should default to no validators', () => {
      expect(input.getValidators()).toEqual([]);
    });

    it('should default to no filters', () => {
      expect(input.getFilters()).toEqual([]);
    });

    it('should default value to null', () => {
      expect(input.getValue()).toBeNull();
    });

    it('should default allowEmpty to false', () => {
      expect(input.getAllowEmpty()).toBe(false);
    });

    it('should default continueIfEmpty to false', () => {
      expect(input.getContinueIfEmpty()).toBe(false);
    });

    it('should default name to null if not provided', () => {
      const i = new Input();
      expect(i.getName()).toBeNull();
    });
  });

  describe('setValue() / getValue()', () => {
    it('should set and get value', () => {
      input.setValue('hello');
      expect(input.getValue()).toBe('hello');
    });

    it('should set hasValue to true for non-null/non-empty', () => {
      input.setValue('hello');
      expect(input.getHasValue()).toBe(true);
    });

    it('should keep hasValue false for null', () => {
      input.setValue(null);
      expect(input.getHasValue()).toBe(false);
    });

    it('should keep hasValue false for empty string', () => {
      input.setValue('');
      expect(input.getHasValue()).toBe(false);
    });

    it('should set raw value when first setting value', () => {
      input.setValue('test');
      expect(input.getRawValue()).toBe('test');
    });
  });

  describe('setRequired() / isRequired()', () => {
    it('should set required flag', () => {
      input.setRequired(false);
      expect(input.isRequired()).toBe(false);
    });
  });

  describe('setAllowEmpty() / getAllowEmpty()', () => {
    it('should set allowEmpty flag', () => {
      input.setAllowEmpty(true);
      expect(input.getAllowEmpty()).toBe(true);
    });
  });

  describe('setContinueIfEmpty() / getContinueIfEmpty()', () => {
    it('should set continueIfEmpty flag', () => {
      input.setContinueIfEmpty(true);
      expect(input.getContinueIfEmpty()).toBe(true);
    });
  });

  describe('setErrorMessage()', () => {
    it('should add error messages', () => {
      input.setErrorMessage('Error 1');
      input.setErrorMessage('Error 2');
      expect(input.getMessages()).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('setRequiredMessage()', () => {
    it('should set custom required message', () => {
      input.setRequiredMessage('Custom required');
      expect(input.customRequiredMessage).toBe('Custom required');
    });

    it('should be chainable', () => {
      expect(input.setRequiredMessage('msg')).toBe(input);
    });

    it('should use custom required message during validation', () => {
      input.setRequiredMessage('Field is mandatory');
      // Do not set a value, so it remains without a value and required
      input.isValid();
      expect(input.getMessages()).toContain('Field is mandatory');
    });

    it('should use default required message when no custom one is set', () => {
      // Do not set a value, so it remains without a value and required
      input.isValid();
      expect(input.getMessages()).toContain('Required, non-empty field');
    });
  });

  describe('isValid()', () => {
    it('should return true for non-required input with no value', () => {
      input.setRequired(false);
      expect(input.isValid()).toBe(true);
    });

    it('should return false for required input with no value', () => {
      expect(input.isValid()).toBe(false);
    });

    it('should return true when empty, not required, and not continueIfEmpty', () => {
      input.setRequired(false);
      input.setValue('');
      // hasValue is false for empty, but we need to check the branch
      // actually setValue('') keeps hasValue false, so it goes to !hasValue && !required => true
      expect(input.isValid()).toBe(true);
    });

    it('should return true when empty and allowEmpty and not continueIfEmpty', () => {
      input.setRequired(true);
      input.setAllowEmpty(true);
      input.setContinueIfEmpty(false);
      // Need hasValue = true but empty value
      // setValue('') makes hasValue false. We need value that is empty but hasValue true
      // Looking at code: empty = (value === null || value === '')
      // hasValue is set to true only if value !== null && value !== ''
      // So to get empty && allowEmpty path, we can't with normal setValue.
      // This path requires hasValue=true + empty=true which is contradictory.
      // Actually let's look more carefully at the flow:
      // if(!hasValue && !required) return true <-- checked above
      // if(!hasValue && required) return false
      // if(empty && !required && !continueIfEmpty) return true
      // if(empty && allowEmpty && !continueIfEmpty) return true
      // For line 136-138: empty && allowEmpty && !continueIfEmpty
      // We need hasValue=true (to pass lines 114-129), and empty=true
      // This is a contradictory state from normal setValue, so let's force it
      input.hasValue = true;
      input.value = null; // empty = true
      expect(input.isValid()).toBe(true);
    });

    it('should run validators when value is present and not empty', () => {
      const mockValidator = {
        isValid: jest.fn().mockReturnValue(true),
        message: null,
      };
      input.setValidators(mockValidator);
      input.setValue('hello');
      expect(input.isValid()).toBe(true);
      expect(mockValidator.isValid).toHaveBeenCalledWith('hello', null);
    });

    it('should return false when a validator fails', () => {
      const mockValidator = {
        isValid: jest.fn().mockReturnValue(false),
        message: 'Validation failed',
      };
      input.setValidators(mockValidator);
      input.setValue('bad');
      expect(input.isValid()).toBe(false);
      expect(input.getMessages()).toContain('Validation failed');
    });

    it('should pass context to validators', () => {
      const mockValidator = {
        isValid: jest.fn().mockReturnValue(true),
        message: null,
      };
      input.setValidators(mockValidator);
      input.setValue('test');
      const context = { otherField: 'value' };
      input.isValid(context);
      expect(mockValidator.isValid).toHaveBeenCalledWith('test', context);
    });

    it('should collect messages from multiple failing validators', () => {
      const validator1 = { isValid: jest.fn().mockReturnValue(false), message: 'Error 1' };
      const validator2 = { isValid: jest.fn().mockReturnValue(false), message: 'Error 2' };
      input.setValidators(validator1);
      input.setValidators(validator2);
      input.setValue('bad');
      input.isValid();
      expect(input.getMessages()).toEqual(expect.arrayContaining(['Error 1', 'Error 2']));
    });
  });

  describe('isValid() - empty, not required, not continueIfEmpty (lines 131-133)', () => {
    it('should return true when value is empty string, not required, and not continueIfEmpty', () => {
      // To hit lines 131-133, we need: hasValue=true, empty=true, !required, !continueIfEmpty
      // This requires forcing hasValue=true while value is empty
      input.setRequired(false);
      input.setContinueIfEmpty(false);
      // Force the state: hasValue must be true to pass earlier guards
      input.hasValue = true;
      input.value = ''; // empty = true (value === '')
      const spy = jest.spyOn(console, 'log').mockImplementation();
      expect(input.isValid()).toBe(true);
      spy.mockRestore();
    });

    it('should return true when value is null, not required, and not continueIfEmpty', () => {
      input.setRequired(false);
      input.setContinueIfEmpty(false);
      input.hasValue = true;
      input.value = null; // empty = true (value === null)
      const spy = jest.spyOn(console, 'log').mockImplementation();
      expect(input.isValid()).toBe(true);
      spy.mockRestore();
    });
  });

  describe('clearValue() / clearRawValue()', () => {
    it('should clear value', () => {
      input.setValue('test');
      input.clearValue();
      expect(input.getValue()).toBeNull();
      expect(input.getHasValue()).toBe(false);
    });

    it('should clear raw value', () => {
      input.setValue('test');
      input.clearRawValue();
      expect(input.getRawValue()).toBeNull();
    });
  });

  describe('setValidators() / setFilters()', () => {
    it('should add validators to the list', () => {
      const v = { isValid: () => true };
      input.setValidators(v);
      expect(input.getValidators()).toContain(v);
    });

    it('should add filters to the list', () => {
      const f = { filter: (v) => v };
      input.setFilters(f);
      expect(input.getFilters()).toContain(f);
    });
  });
});
