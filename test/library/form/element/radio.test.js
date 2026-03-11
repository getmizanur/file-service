const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');

global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Radio = require(path.join(projectRoot, 'library/form/element/radio'));

describe('Radio', () => {
  let radio;

  beforeEach(() => {
    radio = new Radio('color');
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should set name and type', () => {
      expect(radio.getName()).toBe('color');
      expect(radio.getAttribute('type')).toBe('radio');
    });

    it('should not set name when null', () => {
      const r = new Radio(null);
      expect(r.getName()).toBeNull();
    });

    it('should not set name when empty string', () => {
      const r = new Radio('');
      expect(r.getName()).toBeNull();
    });

    it('should not set name when undefined (default)', () => {
      const r = new Radio();
      expect(r.getName()).toBeNull();
    });

    it('should initialise valueOptions and labelOptions as empty', () => {
      expect(radio.getValueOptions()).toEqual({});
      expect(radio.getLabelOptions()).toEqual({});
    });

    it('should have LABEL_APPEND and LABEL_PREPEND constants', () => {
      expect(radio.LABEL_APPEND).toBe('append');
      expect(radio.LABEL_PREPEND).toBe('prepend');
    });

    it('should default labelPosition to null', () => {
      expect(radio.getLabelPosition()).toBeNull();
    });
  });

  // --- setValueOptions / getValueOptions (lines 22-31) ---
  describe('valueOptions', () => {
    it('should set and get value options', () => {
      const opts = { r: 'Red', g: 'Green', b: 'Blue' };
      const ret = radio.setValueOptions(opts);
      expect(ret).toBe(radio);
      expect(radio.getValueOptions()).toEqual(opts);
    });

    it('should ignore null options', () => {
      radio.setValueOptions(null);
      expect(radio.getValueOptions()).toEqual({});
    });

    it('should ignore non-object options', () => {
      radio.setValueOptions('string');
      expect(radio.getValueOptions()).toEqual({});
    });
  });

  // --- setLabelOptions / getLabelOptions (lines 33-42) ---
  describe('labelOptions', () => {
    it('should set and get label options', () => {
      const opts = { class: 'radio-label' };
      const ret = radio.setLabelOptions(opts);
      expect(ret).toBe(radio);
      expect(radio.getLabelOptions()).toEqual(opts);
    });

    it('should ignore null', () => {
      radio.setLabelOptions(null);
      expect(radio.getLabelOptions()).toEqual({});
    });

    it('should ignore non-object', () => {
      radio.setLabelOptions(42);
      expect(radio.getLabelOptions()).toEqual({});
    });
  });

  // --- setLabelPosition / getLabelPosition (lines 44-52) ---
  describe('labelPosition', () => {
    it('should set label position to append', () => {
      const ret = radio.setLabelPosition('append');
      expect(ret).toBe(radio);
      expect(radio.getLabelPosition()).toBe('append');
    });

    it('should set label position to prepend', () => {
      radio.setLabelPosition('prepend');
      expect(radio.getLabelPosition()).toBe('prepend');
    });

    it('should ignore invalid label position', () => {
      radio.setLabelPosition('invalid');
      expect(radio.getLabelPosition()).toBeNull();
    });

    it('should keep previous valid position when setting invalid', () => {
      radio.setLabelPosition('append');
      radio.setLabelPosition('wrong');
      expect(radio.getLabelPosition()).toBe('append');
    });
  });
});
