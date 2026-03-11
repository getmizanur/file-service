const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let Factory;
beforeAll(() => {
  Factory = require(globalThis.applicationPath('/application/table/factory/tag-table-factory'));
});

describe('TagTableFactory', () => {
  it('should create a table instance via createService', () => {
    const mockSm = { get: jest.fn().mockReturnValue({ query: jest.fn() }) };
    const factory = new Factory();
    const table = factory.createService(mockSm);
    expect(table).toBeDefined();
    expect(mockSm.get).toHaveBeenCalledWith('DbAdapter');
  });
});
