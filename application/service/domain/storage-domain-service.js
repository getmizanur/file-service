const Service = require('../abstract-domain-service');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

class StorageService extends Service {

  constructor() {
    super();
    // serviceManager via setServiceManager
  }

  async findBackendByProvider(provider) {
    const table = this.getTable('StorageBackendTable');
    // Fetch all and filter (or add custom query if efficient)
    const rows = await table.fetchAll();
    return rows.find(sb => sb.provider === provider && (sb.is_enabled === true || sb.is_enabled === 1));
  }

  /**
   * Get enabled storage backend by ID
   * @param {string} backendId 
   */
  async getBackend(backendId) {
    const table = this.getTable('StorageBackendTable');
    // Assuming fetchById is available or we Usage a custom query
    // The user's SQL example: SELECT ... FROM storage_backend WHERE storage_backend_id = :id AND is_enabled = true

    // We can usage the table adapter directly for custom query if fetchById doesn't support is_enabled check easily
    // Or just fetchById and check is_enabled in code.
    const backend = await table.fetchById(backendId);

    if (!backend) {
      throw new Error(`Storage backend not found: ${backendId}`);
    }

    // Check if enabled (assuming 'is_enabled' property exists on entity/row)
    // If it's an entity, it might be backend.is_enabled or backend.getIsEnabled()
    const isEnabled = (typeof backend.is_enabled !== 'undefined') ? backend.is_enabled : true; // Default to true if col missing for now

    if (!isEnabled) {
      throw new Error(`Storage backend is disabled: ${backendId}`);
    }

    return backend;
  }

  /**
   * Write stream to storage
   * @param {ReadableStream} stream 
   * @param {Object} backend 
   * @param {string} objectKey 
   */
  async write(stream, backend, objectKey) {
    if (backend.provider === 'local_fs') {
      return this.writeLocal(stream, backend, objectKey);
    }
    throw new Error(`Unsupported storage provider: ${backend.provider}`);
  }

  async writeLocal(stream, backend, objectKey) {
    // Config should be a JSON object or string.
    let config = backend.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        console.error('Failed to parse backend config', e);
        throw new Error('Invalid backend configuration');
      }
    }

    const rootPath = config.root_path || './storage';
    // Resolve root path relative to application root if it starts with .
    const resolvedRoot = path.resolve(global.applicationPath(''), rootPath);
    const fullPath = path.join(resolvedRoot, objectKey);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });

    // Write file
    const writeStream = fs.createWriteStream(fullPath);

    await pipe(stream, writeStream);

    // Return stats?
    const stats = await fs.promises.stat(fullPath);
    return {
      size: stats.size,
      path: fullPath
    };
  }

  /**
   * Read stream from storage
   * @param {Object} backend 
   * @param {string} objectKey 
   * @returns {ReadableStream}
   */
  async read(backend, objectKey) {
    if (backend.provider === 'local_fs') {
      return this.readLocal(backend, objectKey);
    }
    throw new Error(`Unsupported storage provider: ${backend.provider}`);
  }

  async readLocal(backend, objectKey) {
    let config = backend.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        console.error('Failed to parse backend config', e);
        throw new Error('Invalid backend configuration');
      }
    }

    const rootPath = config.root_path || './storage';
    const resolvedRoot = path.resolve(global.applicationPath(''), rootPath);
    // Decode URL-encoded characters (like %20 for spaces)
    const decodedKey = decodeURIComponent(objectKey);
    const fullPath = path.join(resolvedRoot, decodedKey);

    // Check availability
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch (e) {
      throw new Error(`File not found in storage: ${objectKey}`);
    }

    return fs.createReadStream(fullPath);
  }
}

module.exports = StorageService;
