const path = require('path');
const fs = require('fs');
const os = require('os');
const projectRoot = path.resolve(__dirname, '../../../');
const Logger = require(path.join(projectRoot, 'library/util/logger-util'));

function suppressStreamErrors(logger) {
  if (logger.accessStream) logger.accessStream.on('error', () => {});
  if (logger.errorStream) logger.errorStream.on('error', () => {});
}

describe('Logger', () => {
  let tmpDir;
  const tmpDirs = [];

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
    // Cleanup all temp dirs after all tests complete
    setTimeout(() => {
      tmpDirs.forEach(d => {
        try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* ignore */ }
      });
    }, 100);
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    tmpDirs.push(tmpDir);
  });

  describe('constructor', () => {
    it('should create logger with custom log dir', () => {
      const logDir = path.join(tmpDir, 'logs');
      const logger = new Logger(logDir);
      suppressStreamErrors(logger);
      expect(fs.existsSync(logDir)).toBe(true);
      logger.close();
    });

    it('should create logs directory if it does not exist', () => {
      const logDir = path.join(tmpDir, 'nested', 'logs');
      const logger = new Logger(logDir);
      suppressStreamErrors(logger);
      expect(fs.existsSync(logDir)).toBe(true);
      logger.close();
    });
  });

  describe('getDateString', () => {
    it('should return YYYY-MM-DD format', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      const dateStr = logger.getDateString();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      logger.close();
    });
  });

  describe('logAccess', () => {
    it('should write access log entry without throwing', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(() => logger.logAccess('GET /test 200')).not.toThrow();
      logger.close();
    });
  });

  describe('logError', () => {
    it('should write string error without throwing', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(() => logger.logError('Something failed')).not.toThrow();
      logger.close();
    });

    it('should write Error object with stack', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(() => logger.logError(new Error('Test error'))).not.toThrow();
      logger.close();
    });
  });

  describe('getAccessStream / getErrorStream', () => {
    it('should return writable streams', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(logger.getAccessStream()).toBeDefined();
      expect(logger.getErrorStream()).toBeDefined();
      logger.close();
    });
  });

  describe('checkRotation', () => {
    it('should rotate when date changes', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      logger.currentDate = '2020-01-01';
      logger.checkRotation();
      suppressStreamErrors(logger); // new streams after rotation
      expect(logger.currentDate).not.toBe('2020-01-01');
      logger.close();
    });

    it('should not rotate when date is same', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      const currentDate = logger.currentDate;
      logger.checkRotation();
      expect(logger.currentDate).toBe(currentDate);
      logger.close();
    });

    it('should close accessStream and errorStream on rotation', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      // Ensure streams exist
      const accessEnd = jest.spyOn(logger.accessStream, 'end');
      const errorEnd = jest.spyOn(logger.errorStream, 'end');
      // Force date change
      logger.currentDate = '2020-01-01';
      logger.checkRotation();
      suppressStreamErrors(logger);
      expect(accessEnd).toHaveBeenCalled();
      expect(errorEnd).toHaveBeenCalled();
      logger.close();
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete old log files', () => {
      const oldFile = path.join(tmpDir, 'access-2020-01-01.log');
      fs.writeFileSync(oldFile, 'old log');
      const oldTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldFile, oldTime, oldTime);
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(fs.existsSync(oldFile)).toBe(false);
      logger.close();
    });

    it('should keep recent log files', () => {
      const recentFile = path.join(tmpDir, 'access-2025-12-01.log');
      fs.writeFileSync(recentFile, 'recent log');
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(fs.existsSync(recentFile)).toBe(true);
      logger.close();
    });

    it('should skip non-log files', () => {
      const otherFile = path.join(tmpDir, 'readme.txt');
      fs.writeFileSync(otherFile, 'not a log');
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(fs.existsSync(otherFile)).toBe(true);
      logger.close();
    });
  });

  describe('branch coverage', () => {
    it('should use default logDir when none provided (line 20 || fallback)', () => {
      // Constructor with no args uses process.cwd()/logs
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      const logger = new Logger();
      suppressStreamErrors(logger);
      expect(logger.logDir).toContain('logs');
      logger.close();
      process.chdir(origCwd);
    });

    it('should handle null streams during rotation (lines 117-120)', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      // Null out streams before rotation
      logger.accessStream.end();
      logger.errorStream.end();
      logger.accessStream = null;
      logger.errorStream = null;
      logger.currentDate = '2020-01-01';
      expect(() => logger.checkRotation()).not.toThrow();
      suppressStreamErrors(logger);
      // Streams should be re-created
      expect(logger.accessStream).not.toBeNull();
      expect(logger.errorStream).not.toBeNull();
      logger.close();
    });
  });

  describe('close', () => {
    it('should close streams', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      expect(() => logger.close()).not.toThrow();
    });

    it('should handle null streams', () => {
      const logger = new Logger(tmpDir);
      suppressStreamErrors(logger);
      logger.accessStream = null;
      logger.errorStream = null;
      expect(() => logger.close()).not.toThrow();
    });
  });
});
