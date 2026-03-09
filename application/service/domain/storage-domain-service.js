// application/service/domain/storage-domain-service.js
const Service = require('../abstract-domain-service');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const { promisify } = require('node:util');
const pipe = promisify(pipeline);
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

class StorageService extends Service {

  constructor() {
    super();
    // serviceManager via setServiceManager
    this._s3Client = null;
  }

  /**
   * Resolve the storage backend and key_template for a tenant
   * by looking up tenant_policy → storage_backend
   * @param {string} tenantId
   * @returns {{ backend: Object, keyTemplate: string }}
   */
  async resolveBackendForTenant(tenantId) {
    const tenantPolicyTable = this.getTable('TenantPolicyTable');
    const policy = await tenantPolicyTable.fetchByTenantId(tenantId);

    if (!policy) {
      throw new Error(`No tenant policy found for tenant: ${tenantId}`);
    }

    const storageBackendId = policy.getStorageBackendId();
    const keyTemplate = policy.getKeyTemplate();

    if (!storageBackendId) {
      throw new Error(`Tenant policy has no storage_backend_id for tenant: ${tenantId}`);
    }

    const backend = await this.getBackend(storageBackendId);

    return { backend, keyTemplate };
  }

  /**
   * Interpolate a key_template with variable values.
   * Template placeholders: {tenant_id}, {folder_id}, {file_id},
   *   {sanitized_filename}, {integration}, {applicationRefId}, {documentType}
   * Missing variables are replaced with a sensible default.
   * @param {string} template
   * @param {Object} variables
   * @returns {string}
   */
  interpolateKeyTemplate(template, variables = {}) {
    const defaults = {
      tenant_id: 'unknown',
      folder_id: 'root',
      file_id: 'unknown',
      sanitized_filename: 'file',
      integration: 'admin',
      applicationRefId: 'none',
      documentType: 'general'
    };

    const merged = { ...defaults, ...variables };

    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return merged[key] !== undefined ? merged[key] : match;
    });
  }

  async findBackendByProvider(provider) {
    const table = this.getTable('StorageBackendTable');
    const rows = await table.fetchAll();
    return rows.find(sb => sb.provider === provider && (sb.is_enabled === true || sb.is_enabled === 1));
  }

  /**
   * Get enabled storage backend by ID
   * @param {string} backendId
   */
  async getBackend(backendId) {
    const table = this.getTable('StorageBackendTable');
    const backend = await table.fetchById(backendId);

    if (!backend) {
      throw new Error(`Storage backend not found: ${backendId}`);
    }

    const isEnabled = backend.getIsEnabled();
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
   * @param {Object} [options] - { sizeBytes, contentType }
   */
  async write(stream, backend, objectKey, options = {}) {
    const provider = backend.getProvider ? backend.getProvider() : backend.provider;

    if (provider === 'local_fs') {
      return this.writeLocal(stream, backend, objectKey);
    }
    if (provider === 'aws_s3') {
      return this.writeS3(stream, backend, objectKey, options);
    }
    throw new Error(`Unsupported storage provider: ${provider}`);
  }

  async writeLocal(stream, backend, objectKey) {
    let config = backend.getConfig ? backend.getConfig() : backend.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        console.error('Failed to parse backend config', e);
        throw new Error('Invalid backend configuration');
      }
    }

    const rootPath = config.root_path || './storage';
    const resolvedRoot = path.resolve(globalThis.applicationPath(''), rootPath);
    const fullPath = path.join(resolvedRoot, objectKey);
    const dir = path.dirname(fullPath);

    await fs.promises.mkdir(dir, { recursive: true });

    const writeStream = fs.createWriteStream(fullPath);
    await pipe(stream, writeStream);

    const stats = await fs.promises.stat(fullPath);
    return {
      size: stats.size,
      path: fullPath
    };
  }

  /**
   * Write stream to AWS S3.
   * Uses multipart Upload when file size exceeds the configured threshold
   * (upload.useMultipartAboveBytes), otherwise uses a single PutObjectCommand.
   * @param {ReadableStream} stream
   * @param {Object} backend
   * @param {string} objectKey
   * @param {Object} [options] - { sizeBytes, contentType }
   */
  async writeS3(stream, backend, objectKey, options = {}) {
    const config = this._getBackendConfig(backend);
    const s3Client = this._getS3Client(config.region);
    const bucket = config.bucket;
    const prefix = this._cleanPrefix(config.prefix);
    const s3Key = prefix ? `${prefix}${objectKey}` : objectKey;

    const sizeBytes = options.sizeBytes || 0;
    const contentType = options.contentType || 'application/octet-stream';

    // Multipart threshold from backend config (default 50MB)
    const multipartThreshold = config.upload?.useMultipartAboveBytes
      || 52428800;

    if (sizeBytes > multipartThreshold) {
      return this._writeS3Multipart(s3Client, bucket, s3Key, stream, contentType, sizeBytes);
    }

    return this._writeS3Single(s3Client, bucket, s3Key, stream, contentType);
  }

  /**
   * Single PutObject upload for files <= multipart threshold
   */
  async _writeS3Single(s3Client, bucket, s3Key, stream, contentType) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: body,
      ContentType: contentType,
    });

    await s3Client.send(command);

    return { size: body.length };
  }

  /**
   * Multipart upload for files > multipart threshold.
   * Streams directly to S3 — no full buffering in memory.
   * Part size: 10MB, parallel uploads: 4.
   * @returns {{ size: number }}
   */
  async _writeS3Multipart(s3Client, bucket, s3Key, stream, contentType, sizeBytes) {
    const PART_SIZE = 10 * 1024 * 1024; // 10MB per part
    const QUEUE_SIZE = 4; // 4 concurrent part uploads

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: s3Key,
        Body: stream,
        ContentType: contentType,
      },
      partSize: PART_SIZE,
      queueSize: QUEUE_SIZE,
      leavePartsOnError: false,
    });

    await upload.done();

    // Size is the declared content-length from the request
    return { size: sizeBytes };
  }

  /**
   * Read stream from storage
   * @param {Object} backend
   * @param {string} objectKey
   * @returns {ReadableStream}
   */
  async read(backend, objectKey) {
    const provider = backend.getProvider ? backend.getProvider() : backend.provider;

    if (provider === 'local_fs') {
      return this.readLocal(backend, objectKey);
    }
    if (provider === 'aws_s3') {
      return this.readS3(backend, objectKey);
    }
    throw new Error(`Unsupported storage provider: ${provider}`);
  }

  async readLocal(backend, objectKey) {
    let config = backend.getConfig ? backend.getConfig() : backend.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        console.error('Failed to parse backend config', e);
        throw new Error('Invalid backend configuration');
      }
    }

    const rootPath = config.root_path || './storage';
    const resolvedRoot = path.resolve(globalThis.applicationPath(''), rootPath);
    const decodedKey = decodeURIComponent(objectKey);
    const fullPath = path.join(resolvedRoot, decodedKey);

    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch (e) {
      throw new Error(`File not found in storage: ${objectKey}`);
    }

    return fs.createReadStream(fullPath);
  }

  /**
   * Read object from AWS S3
   * @param {Object} backend
   * @param {string} objectKey
   * @returns {ReadableStream}
   */
  async readS3(backend, objectKey) {
    const config = this._getBackendConfig(backend);
    const s3Client = this._getS3Client(config.region);
    const bucket = config.bucket;
    const prefix = this._cleanPrefix(config.prefix);
    const decodedKey = decodeURIComponent(objectKey);
    const s3Key = prefix ? `${prefix}${decodedKey}` : decodedKey;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    return response.Body;
  }

  /**
   * Get the max upload size in bytes from storage backend config.
   * Default: 524288000 (500MB)
   * @param {Object} backend - storage backend entity
   * @returns {number}
   */
  getMaxUploadBytes(backend) {
    if (backend) {
      const config = this._getBackendConfig(backend);
      return config.limits?.maxUploadBytes || 524288000;
    }
    return 524288000;
  }

  /**
   * Build a fully qualified storage URI for the given object key.
   * Includes the provider scheme, bucket, and prefix from config.
   *
   * Example (aws_s3):  s3://files-dev.dailypolitics.com/tenant-uploads/tenants/abc/derivatives/xyz/thumbnail_webp256.webp
   * Example (local_fs): file:///var/data/storage/tenants/abc/files/xyz/doc.pdf
   *
   * @param {string} objectKey
   * @param {Object} [backend] - storage backend entity (used to determine provider)
   * @returns {string}
   */
  buildStorageUri(objectKey, backend) {
    if (!backend) return null;

    const provider = backend.getProvider ? backend.getProvider() : backend.provider;

    if (provider === 'local_fs') {
      let localConfig = backend.getConfig ? backend.getConfig() : backend.config;
      if (typeof localConfig === 'string') {
        try { localConfig = JSON.parse(localConfig); } catch (_) { /* Intentionally ignored - invalid JSON config; fall back to empty object */ localConfig = {}; }
      }
      const rootPath = localConfig?.root_path || './storage';
      const resolvedRoot = path.resolve(globalThis.applicationPath(''), rootPath);
      return `file://${path.join(resolvedRoot, objectKey)}`;
    }

    // aws_s3
    const config = this._getBackendConfig(backend);
    if (!config.bucket) return null;
    const prefix = this._cleanPrefix(config.prefix);
    return `s3://${config.bucket}/${prefix}${objectKey}`;
  }

  /**
   * Parse the storage backend's config JSON into a plain object.
   * @param {Object} backend - storage backend entity
   * @returns {Object}
   */
  _getBackendConfig(backend) {
    let config = backend.getConfig ? backend.getConfig() : backend.config;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch (_) { /* Intentionally ignored - invalid JSON config; fall back to empty object */ config = {}; }
    }
    return config || {};
  }

  /**
   * Clean a storage prefix: "/tenant-uploads/*" → "tenant-uploads/"
   * Returns empty string if no prefix.
   * @param {string} raw
   * @returns {string}
   */
  _cleanPrefix(raw) {
    let prefix = (raw || '')
      .replace(/^\/+/, '')   // strip leading slashes
      .replace(/\/?\*$/, '') // strip trailing /* or *
      .replace(/\/+$/, '');  // strip trailing slashes
    if (prefix) prefix += '/';
    return prefix;
  }

  /**
   * Get or create a cached S3Client instance
   * @param {string} region
   * @returns {S3Client}
   */
  _getS3Client(region) {
    if (!this._s3Client) {
      this._s3Client = new S3Client({ region });
    }
    return this._s3Client;
  }
}

module.exports = StorageService;
