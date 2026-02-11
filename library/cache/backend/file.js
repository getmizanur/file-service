const fs = require('fs');
const path = require('path');

/**
 * File backend for cache system
 * Stores cache data as files in the filesystem
 */
class File {
  constructor(options = {}) {
    this.options = {
      cache_dir: options.cache_dir || '/tmp/cache',
      file_locking: options.file_locking !== false, // Default true
      read_control: options.read_control !== false, // Default true
      file_name_prefix: options.file_name_prefix || 'app_cache',
      cache_file_umask: options.cache_file_umask || 0o644,
      hashed_directory_level: options.hashed_directory_level || 0,
      hashed_directory_umask: options.hashed_directory_umask || 0o755,
      ...options
    };

    // Ensure cache directory exists
    this.ensureCacheDirectory();
  }

  /**
   * Ensure cache directory exists
   */
  ensureCacheDirectory() {
    try {
      if(!fs.existsSync(this.options.cache_dir)) {
        fs.mkdirSync(this.options.cache_dir, {
          recursive: true,
          mode: this.options.hashed_directory_umask
        });
      }
    } catch (error) {
      throw new Error(`Cannot create cache directory: ${error.message}`);
    }
  }

  /**
   * Generate file path for cache ID
   * @param {string} id - Cache identifier
   * @returns {string} - Full file path
   */
  getFilePath(id) {
    const filename = `${this.options.file_name_prefix}---${this.sanitizeId(id)}`;

    if(this.options.hashed_directory_level > 0) {
      // Create hashed subdirectories for better performance
      const hash = this.hashId(id);
      let subPath = '';

      for(let i = 0; i < this.options.hashed_directory_level; i++) {
        const char = hash.charAt(i) || '0';
        subPath = path.join(subPath, char);
      }

      const dirPath = path.join(this.options.cache_dir, subPath);

      // Ensure subdirectory exists
      if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
          recursive: true,
          mode: this.options.hashed_directory_umask
        });
      }

      return path.join(dirPath, filename);
    }

    return path.join(this.options.cache_dir, filename);
  }

  /**
   * Sanitize cache ID for filename
   * @param {string} id - Cache identifier
   * @returns {string} - Sanitized ID
   */
  sanitizeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Hash cache ID for directory structure
   * @param {string} id - Cache identifier
   * @returns {string} - Hashed ID
   */
  hashId(id) {
    // Simple hash function for directory distribution
    let hash = 0;
    for(let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Load data from cache file
   * @param {string} id - Cache identifier
   * @returns {object|false} - Cache data or false if not found
   */
  load(id) {
    try {
      const filePath = this.getFilePath(id);

      if(!fs.existsSync(filePath)) {
        return false;
      }

      const fileData = fs.readFileSync(filePath, 'utf8');

      if(this.options.read_control) {
        // Read control - verify data integrity
        const lines = fileData.split('\n');
        if(lines.length < 2) {
          return false;
        }

        const controlData = lines[0];
        const content = lines.slice(1).join('\n');

        try {
          const data = JSON.parse(content);

          // Verify control data matches
          const expectedControl = this.generateControlData(data);
          if(controlData !== expectedControl) {
            console.warn('Cache control data mismatch, removing file');
            this.remove(id);
            return false;
          }

          return data;
        } catch (e) {
          console.warn('Invalid cache data format, removing file');
          this.remove(id);
          return false;
        }
      } else {
        return JSON.parse(fileData);
      }
    } catch (error) {
      console.error('File cache load error:', error);
      return false;
    }
  }

  /**
   * Save data to cache file
   * @param {object} data - Cache data to save
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  save(data, id) {
    try {
      const filePath = this.getFilePath(id);
      let fileContent;

      if(this.options.read_control) {
        // Read control for data integrity
        const controlData = this.generateControlData(data);
        fileContent = controlData + '\n' + JSON.stringify(data);
      } else {
        fileContent = JSON.stringify(data);
      }

      // Write with file locking if enabled
      if(this.options.file_locking) {
        const tempPath = filePath + '.tmp';
        fs.writeFileSync(tempPath, fileContent, {
          mode: this.options.cache_file_umask
        });
        fs.renameSync(tempPath, filePath);
      } else {
        fs.writeFileSync(filePath, fileContent, {
          mode: this.options.cache_file_umask
        });
      }

      return true;
    } catch (error) {
      console.error('File cache save error:', error);
      return false;
    }
  }

  /**
   * Remove cache file
   * @param {string} id - Cache identifier
   * @returns {boolean} - Success status
   */
  remove(id) {
    try {
      const filePath = this.getFilePath(id);

      if(fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return true;
    } catch (error) {
      console.error('File cache remove error:', error);
      return false;
    }
  }

  /**
   * Clean cache files
   * @param {string} mode - Cleaning mode: 'all', 'old'
   * @param {array} tags - Tags (not implemented in file backend)
   * @returns {boolean} - Success status
   */
  clean(mode = 'all', tags = []) {
    try {
      if(mode === 'all') {
        return this.cleanAll();
      } else if(mode === 'old') {
        return this.cleanExpired();
      }

      // Tag-based cleaning not implemented for file backend
      console.warn('Tag-based cleaning not supported in File backend');
      return false;
    } catch (error) {
      console.error('File cache clean error:', error);
      return false;
    }
  }

  /**
   * Clean all cache files
   * @returns {boolean} - Success status
   */
  cleanAll() {
    try {
      this.removeDirectoryContents(this.options.cache_dir);
      return true;
    } catch (error) {
      console.error('Clean all error:', error);
      return false;
    }
  }

  /**
   * Clean expired cache files
   * @returns {boolean} - Success status
   */
  cleanExpired() {
    try {
      this.cleanExpiredInDirectory(this.options.cache_dir);
      return true;
    } catch (error) {
      console.error('Clean expired error:', error);
      return false;
    }
  }

  /**
   * Recursively remove directory contents
   * @param {string} dirPath - Directory path
   */
  removeDirectoryContents(dirPath) {
    if(!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);

    for(const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if(stat.isDirectory()) {
        this.removeDirectoryContents(filePath);
        fs.rmdirSync(filePath);
      } else if(file.startsWith(this.options.file_name_prefix)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Recursively clean expired files in directory
   * @param {string} dirPath - Directory path
   */
  cleanExpiredInDirectory(dirPath) {
    if(!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);
    const now = Date.now();

    for(const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if(stat.isDirectory()) {
        this.cleanExpiredInDirectory(filePath);
      } else if(file.startsWith(this.options.file_name_prefix)) {
        try {
          const data = this.loadFile(filePath);
          if(data && data.expires && now > data.expires) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // If we can't read the file, remove it
          fs.unlinkSync(filePath);
        }
      }
    }
  }

  /**
   * Load file directly (helper for cleaning)
   * @param {string} filePath - File path
   * @returns {object|null} - Parsed data or null
   */
  loadFile(filePath) {
    try {
      const fileData = fs.readFileSync(filePath, 'utf8');

      if(this.options.read_control) {
        const lines = fileData.split('\n');
        if(lines.length < 2) return null;
        return JSON.parse(lines.slice(1).join('\n'));
      } else {
        return JSON.parse(fileData);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate control data for read control
   * @param {object} data - Cache data
   * @returns {string} - Control string
   */
  generateControlData(data) {
    // Simple control data for integrity verification
    return `control_${JSON.stringify(data).length}_${data.created || Date.now()}`;
  }

  /**
   * Get cache statistics
   * @returns {object} - Statistics
   */
  getStats() {
    try {
      const stats = {
        backend: 'File',
        cache_dir: this.options.cache_dir,
        total_files: 0,
        total_size: 0,
        expired_files: 0
      };

      this.collectStats(this.options.cache_dir, stats);

      return stats;
    } catch (error) {
      return {
        backend: 'File',
        error: error.message
      };
    }
  }

  /**
   * Collect statistics recursively
   * @param {string} dirPath - Directory path
   * @param {object} stats - Statistics object
   */
  collectStats(dirPath, stats) {
    if(!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);
    const now = Date.now();

    for(const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if(stat.isDirectory()) {
        this.collectStats(filePath, stats);
      } else if(file.startsWith(this.options.file_name_prefix)) {
        stats.total_files++;
        stats.total_size += stat.size;

        // Check if expired
        try {
          const data = this.loadFile(filePath);
          if(data && data.expires && now > data.expires) {
            stats.expired_files++;
          }
        } catch (error) {
          // Count unreadable files as expired
          stats.expired_files++;
        }
      }
    }
  }
}

module.exports = File;