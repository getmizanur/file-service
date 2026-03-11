const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const ProfilerFactory = require(path.join(projectRoot, 'library/profiler/profiler-factory'));

describe('ProfilerFactory', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
  });

  it('should create a profiler', () => {
    const factory = new ProfilerFactory();
    const sm = {
      get: jest.fn(() => null),
      has: jest.fn(() => false)
    };
    const profiler = factory.createService(sm);
    expect(profiler).toBeDefined();
  });
});
