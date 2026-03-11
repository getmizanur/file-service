const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AbstractViewHelperFactory = require(path.join(projectRoot, 'library/mvc/view/abstract-view-helper-factory'));

describe('AbstractViewHelperFactory', () => {

  it('should throw "must be implemented by subclass" when createService is called', () => {
    const factory = new AbstractViewHelperFactory();
    expect(() => factory.createService({})).toThrow('must be implemented by subclass');
  });

});
