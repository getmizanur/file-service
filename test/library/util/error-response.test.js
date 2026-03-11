const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const ErrorResponse = require(path.join(projectRoot, 'library/util/error-response'));

describe('ErrorResponse', () => {
  it('should extend Error', () => {
    const err = new ErrorResponse('Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ErrorResponse);
  });

  it('should set message and statusCode', () => {
    const err = new ErrorResponse('Server error', 500);
    expect(err.message).toBe('Server error');
    expect(err.statusCode).toBe(500);
  });

  it('should have a stack trace', () => {
    const err = new ErrorResponse('Test', 400);
    expect(err.stack).toBeDefined();
  });
});
