const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const DerivativeOption = require(globalThis.applicationPath('/application/option/derivative-option'));

describe('DerivativeOption', () => {

  describe('constructor', () => {
    it('works with empty options', () => {
      const option = new DerivativeOption();
      expect(option).toBeInstanceOf(DerivativeOption);
    });

    it('accepts soffice_bin option', () => {
      const option = new DerivativeOption({ soffice_bin: '/usr/bin/soffice' });
      expect(option.getSofficeBin()).toBe('/usr/bin/soffice');
    });

    it('throws on unknown option', () => {
      expect(() => new DerivativeOption({ unknown_key: 'value' })).toThrow(TypeError);
    });
  });

  describe('getSofficeBin()', () => {
    it('returns null by default', () => {
      const option = new DerivativeOption();
      expect(option.getSofficeBin()).toBeNull();
    });

    it('returns the value set via constructor', () => {
      const option = new DerivativeOption({ soffice_bin: '/opt/libreoffice/soffice' });
      expect(option.getSofficeBin()).toBe('/opt/libreoffice/soffice');
    });
  });

  describe('setSofficeBin()', () => {
    it('updates the value', () => {
      const option = new DerivativeOption();
      option.setSofficeBin('/usr/local/bin/soffice');
      expect(option.getSofficeBin()).toBe('/usr/local/bin/soffice');
    });

    it('is chainable', () => {
      const option = new DerivativeOption();
      const result = option.setSofficeBin('/usr/bin/soffice');
      expect(result).toBe(option);
    });
  });
});
