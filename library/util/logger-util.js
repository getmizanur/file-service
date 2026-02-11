const fs = require('fs');
const path = require('path');

/**
 * Logger Utility
 *
 * Provides file-based logging with daily rotation
 * Creates separate log files for access and error logs with date-based naming
 *
 * Features:
 * - Daily log rotation (e.g., access-2025-12-10.log)
 * - Automatic logs directory creation
 * - Timestamp prefixing for log entries
 * - Separate streams for access and error logs
 */
class Logger {

  constructor(logDir = null) {
    this.logDir = logDir || path.join(process.cwd(), 'logs');
    this.accessStream = null;
    this.errorStream = null;
    this.currentDate = this.getDateString();

    // Ensure logs directory exists
    this.ensureLogDirectory();

    // Initialize log streams
    this.initializeStreams();
  }

  /**
   * Get current date as YYYY-MM-DD string
   * @returns {string} Date string in YYYY-MM-DD format
   */
  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Ensure logs directory exists
   * Creates directory if it doesn't exist
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`Created logs directory: ${this.logDir}`);
    }
  }

  /**
   * Initialize log file streams
   * Creates write streams for access and error logs
   */
  initializeStreams() {
    const dateStr = this.getDateString();

    const accessLogPath = path.join(this.logDir, `access-${dateStr}.log`);
    const errorLogPath = path.join(this.logDir, `error-${dateStr}.log`);

    this.accessStream = fs.createWriteStream(accessLogPath, {
      flags: 'a' // append mode
    });

    this.errorStream = fs.createWriteStream(errorLogPath, {
      flags: 'a' // append mode
    });

    console.log(`Access log: ${accessLogPath}`);
    console.log(`Error log: ${errorLogPath}`);
  }

  /**
   * Check if date has changed and rotate logs if needed
   * Called periodically to ensure daily log rotation
   */
  checkRotation() {
    const currentDate = this.getDateString();

    if (currentDate !== this.currentDate) {
      console.log(`Date changed, rotating logs from ${this.currentDate} to ${currentDate}`);

      // Close existing streams
      if (this.accessStream) {
        this.accessStream.end();
      }
      if (this.errorStream) {
        this.errorStream.end();
      }

      // Update current date
      this.currentDate = currentDate;

      // Reinitialize streams with new date
      this.initializeStreams();
    }
  }

  /**
   * Get access log stream
   * Returns writable stream for access logs
   * Checks for rotation before returning
   * @returns {fs.WriteStream} Access log stream
   */
  getAccessStream() {
    this.checkRotation();
    return this.accessStream;
  }

  /**
   * Get error log stream
   * Returns writable stream for error logs
   * Checks for rotation before returning
   * @returns {fs.WriteStream} Error log stream
   */
  getErrorStream() {
    this.checkRotation();
    return this.errorStream;
  }

  /**
   * Log access entry
   * Writes HTTP access log entry with timestamp
   * @param {string} message - Log message
   */
  logAccess(message) {
    this.checkRotation();
    const timestamp = new Date().toISOString();
    this.accessStream.write(`[${timestamp}] ${message}\n`);
  }

  /**
   * Log error entry
   * Writes error log entry with timestamp
   * @param {string|Error} error - Error message or Error object
   */
  logError(error) {
    this.checkRotation();
    const timestamp = new Date().toISOString();

    if (error instanceof Error) {
      this.errorStream.write(`[${timestamp}] ${error.stack}\n`);
    } else {
      this.errorStream.write(`[${timestamp}] ${error}\n`);
    }
  }

  /**
   * Close all log streams
   * Should be called on application shutdown
   */
  close() {
    if (this.accessStream) {
      this.accessStream.end();
    }
    if (this.errorStream) {
      this.errorStream.end();
    }
    console.log('Log streams closed');
  }
}

module.exports = Logger;
