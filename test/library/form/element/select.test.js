const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Select = require(path.join(projectRoot, 'library/form/element/select'));

describe('Select', () => {
  let sel;

  beforeEach(() => {
    sel = new Select('country');
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should set name and type', () => {
      expect(sel.getName()).toBe('country');
      expect(sel.getAttribute('type')).toBe('select');
    });

    it('should initialise valueOptions as empty array', () => {
      expect(sel.getOptions()).toEqual([]);
    });

    it('should initialise emptyOption as null', () => {
      expect(sel.getEmptyOption()).toBeNull();
    });

    it('should not set name when null', () => {
      const s = new Select(null);
      expect(s.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const s = new Select('');
      expect(s.getName()).toBeNull();
    });

    it('should not set name when undefined (default)', () => {
      const s = new Select();
      expect(s.getName()).toBeNull();
    });
  });

  // --- setOptions (lines 26-64) ---
  describe('setOptions', () => {
    it('should set options from array of objects with value/label', () => {
      const opts = [
        { value: 'US', label: 'United States' },
        { value: 'UK', label: 'United Kingdom' },
      ];
      const ret = sel.setOptions(opts);
      expect(ret).toBe(sel);
      expect(sel.getOptions()).toEqual([
        { value: 'US', label: 'United States', attributes: {} },
        { value: 'UK', label: 'United Kingdom', attributes: {} },
      ]);
    });

    it('should use value as label when label is undefined', () => {
      sel.setOptions([{ value: 'US' }]);
      expect(sel.getOptions()[0].label).toBe('US');
    });

    it('should preserve attributes on options', () => {
      sel.setOptions([{ value: 'US', label: 'US', attributes: { disabled: true } }]);
      expect(sel.getOptions()[0].attributes).toEqual({ disabled: true });
    });

    it('should handle array of primitives', () => {
      sel.setOptions(['red', 'green', 'blue']);
      expect(sel.getOptions()).toEqual([
        { value: 'red', label: 'red', attributes: {} },
        { value: 'green', label: 'green', attributes: {} },
        { value: 'blue', label: 'blue', attributes: {} },
      ]);
    });

    it('should handle object (key-value pairs)', () => {
      sel.setOptions({ US: 'United States', UK: 'United Kingdom' });
      expect(sel.getOptions()).toEqual([
        { value: 'US', label: 'United States', attributes: {} },
        { value: 'UK', label: 'United Kingdom', attributes: {} },
      ]);
    });

    it('should clear options when null', () => {
      sel.setOptions([{ value: 'a', label: 'A' }]);
      sel.setOptions(null);
      expect(sel.getOptions()).toEqual([]);
    });

    it('should clear options when undefined', () => {
      sel.setOptions([{ value: 'a', label: 'A' }]);
      sel.setOptions(undefined);
      expect(sel.getOptions()).toEqual([]);
    });

    it('should ignore non-object/non-array types', () => {
      sel.setOptions([{ value: 'a', label: 'A' }]);
      sel.setOptions('string');
      // 'string' is not null/undefined/array/object, so valueOptions unchanged?
      // Actually the code returns this without modifying, so previous options remain
      expect(sel.getOptions()).toEqual([
        { value: 'a', label: 'A', attributes: {} },
      ]);
    });

    it('should ignore number type', () => {
      const ret = sel.setOptions(42);
      expect(ret).toBe(sel);
    });
  });

  // --- setEmptyOption / getEmptyOption (lines 80-94) ---
  describe('emptyOption', () => {
    it('should set empty option with label and default value', () => {
      const ret = sel.setEmptyOption('-- Select --');
      expect(ret).toBe(sel);
      expect(sel.getEmptyOption()).toEqual({ value: '', label: '-- Select --' });
    });

    it('should set empty option with custom value', () => {
      sel.setEmptyOption('Choose...', '-1');
      expect(sel.getEmptyOption()).toEqual({ value: '-1', label: 'Choose...' });
    });
  });

  // --- isSelected (lines 101-114) ---
  describe('isSelected', () => {
    it('should return true when value matches', () => {
      sel.setValue('US');
      expect(sel.isSelected('US')).toBe(true);
    });

    it('should return false when value does not match', () => {
      sel.setValue('US');
      expect(sel.isSelected('UK')).toBe(false);
    });

    it('should handle array selected values', () => {
      sel.setValue(['US', 'UK']);
      expect(sel.isSelected('US')).toBe(true);
      expect(sel.isSelected('UK')).toBe(true);
      expect(sel.isSelected('FR')).toBe(false);
    });

    it('should return false when no value set', () => {
      expect(sel.isSelected('US')).toBe(false);
    });

    it('should handle null optionValue', () => {
      sel.setValue('');
      expect(sel.isSelected(null)).toBe(true);
    });

    it('should handle undefined optionValue', () => {
      sel.setValue('');
      expect(sel.isSelected(undefined)).toBe(true);
    });

    it('should compare as strings', () => {
      sel.setValue(1);
      expect(sel.isSelected('1')).toBe(true);
    });

    it('should return false for null selectedValue (not array)', () => {
      // getValue returns null when not set
      expect(sel.isSelected('anything')).toBe(false);
    });
  });
});
