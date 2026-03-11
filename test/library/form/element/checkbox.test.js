const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Checkbox = require(path.join(projectRoot, 'library/form/element/checkbox'));

describe('Checkbox', () => {
  let cb;

  beforeEach(() => {
    cb = new Checkbox('agree');
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should set name and type', () => {
      expect(cb.getName()).toBe('agree');
      expect(cb.getAttribute('type')).toBe('checkbox');
    });

    it('should default checkedValue to "1" and uncheckedValue to "0"', () => {
      expect(cb.getCheckedValue()).toBe('1');
      expect(cb.getUncheckedValue()).toBe('0');
    });

    it('should set HTML value attribute to checkedValue', () => {
      expect(cb.getAttribute('value')).toBe('1');
    });

    it('should handle null name', () => {
      const c = new Checkbox();
      expect(c.getName()).toBeNull();
      expect(c.getAttribute('type')).toBe('checkbox');
    });

    it('should handle empty string name', () => {
      const c = new Checkbox('');
      expect(c.getName()).toBeNull();
    });

    it('should handle undefined name', () => {
      const c = new Checkbox(undefined);
      expect(c.getName()).toBeNull();
    });
  });

  // --- setCheckedValue / setUncheckedValue (lines 27-57) ---
  describe('checkedValue / uncheckedValue', () => {
    it('should set checked value and update attribute', () => {
      const ret = cb.setCheckedValue('yes');
      expect(ret).toBe(cb);
      expect(cb.getCheckedValue()).toBe('yes');
      expect(cb.getAttribute('value')).toBe('yes');
    });

    it('should convert checked value to string', () => {
      cb.setCheckedValue(42);
      expect(cb.getCheckedValue()).toBe('42');
    });

    it('should set unchecked value', () => {
      const ret = cb.setUncheckedValue('no');
      expect(ret).toBe(cb);
      expect(cb.getUncheckedValue()).toBe('no');
    });

    it('should convert unchecked value to string', () => {
      cb.setUncheckedValue(0);
      expect(cb.getUncheckedValue()).toBe('0');
    });
  });

  // --- setChecked / isChecked (lines 64-79) ---
  describe('setChecked / isChecked', () => {
    it('should check the checkbox', () => {
      const ret = cb.setChecked(true);
      expect(ret).toBe(cb);
      expect(cb.isChecked()).toBe(true);
      expect(cb.getAttribute('checked')).toBe('checked');
    });

    it('should uncheck the checkbox', () => {
      cb.setChecked(true);
      cb.setChecked(false);
      expect(cb.isChecked()).toBe(false);
      expect(cb.hasAttribute('checked')).toBe(false);
    });

    it('should default to unchecked', () => {
      expect(cb.isChecked()).toBe(false);
    });
  });

  // --- setValue (lines 87-106) ---
  describe('setValue', () => {
    it('should check when value matches checkedValue', () => {
      cb.setValue('1');
      expect(cb.isChecked()).toBe(true);
    });

    it('should check when value is true', () => {
      cb.setValue(true);
      expect(cb.isChecked()).toBe(true);
    });

    it('should check when value is 1 (number)', () => {
      cb.setValue(1);
      expect(cb.isChecked()).toBe(true);
    });

    it('should check when value is "on"', () => {
      cb.setValue('on');
      expect(cb.isChecked()).toBe(true);
    });

    it('should check when value is "yes"', () => {
      cb.setValue('yes');
      expect(cb.isChecked()).toBe(true);
    });

    it('should check when value matches HTML value attribute', () => {
      cb.setCheckedValue('accept');
      cb.setValue('accept');
      expect(cb.isChecked()).toBe(true);
    });

    it('should uncheck for non-truthy values', () => {
      cb.setChecked(true);
      cb.setValue('0');
      expect(cb.isChecked()).toBe(false);
    });

    it('should uncheck for false', () => {
      cb.setValue(false);
      expect(cb.isChecked()).toBe(false);
    });

    it('should keep HTML value as checkedValue after setValue', () => {
      cb.setValue('on');
      expect(cb.getAttribute('value')).toBe('1');
    });

    it('should return this for chaining', () => {
      expect(cb.setValue('1')).toBe(cb);
    });
  });

  // --- getValue (lines 112-114) ---
  describe('getValue', () => {
    it('should return checkedValue when checked', () => {
      cb.setChecked(true);
      expect(cb.getValue()).toBe('1');
    });

    it('should return uncheckedValue when unchecked', () => {
      expect(cb.getValue()).toBe('0');
    });

    it('should return custom checked/unchecked values', () => {
      cb.setCheckedValue('yes');
      cb.setUncheckedValue('no');
      cb.setChecked(true);
      expect(cb.getValue()).toBe('yes');
      cb.setChecked(false);
      expect(cb.getValue()).toBe('no');
    });
  });
});
