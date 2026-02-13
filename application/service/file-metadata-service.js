const AbstractService = require('./abstract-service');
const FileMetadataTable = require('../table/file-metadata-table');

/**
 * FileMetadataService - Service class for managing file metadata
 * Thin orchestration layer: delegates SQL to FileMetadataTable.
 */
class FileMetadataService extends AbstractService {
  constructor() {
    super();
  }

  /**
   * Get FileMetadataTable (data access layer)
   */
  async getFileMetadataTable() {
    const adapter = await this.initializeDatabase();
    return new FileMetadataTable({ adapter });
  }

  /**
   * Fetch files by folder ID and user email
   */
  async getFilesByFolder(email, folderId) {
    const table = await this.getFileMetadataTable();
    return table.fetchFilesByFolder(email, folderId);
  }

  /**
   * Fetch files by IDs
   * @param {string[]} ids
   */
  async getFilesByIds(ids) {
    const table = await this.getFileMetadataTable();
    return table.fetchByIds(ids);
  }

  /**
   * Soft delete a file
   * @param {string} fileId
   * @param {string} userEmail
   * @returns {boolean} True if deleted
   */
  async deleteFile(fileId, userEmail) {
    const adapter = await this.initializeDatabase();
    const Select = require(global.applicationPath('/library/db/sql/select'));

    // 1. Resolve user
    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, ['u.user_id', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', userEmail);
    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);
    if (userRows.length === 0) throw new Error('User not found');
    const { user_id, tenant_id } = userRows[0];

    // 2. Fetch File to verify tenant
    const table = await this.getFileMetadataTable();
    // We need fetchById in table (it exists)
    const file = await table.fetchById(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    // 3. Soft Delete
    const now = new Date();
    await table.update(
      { file_id: fileId },
      { deleted_at: now, deleted_by: user_id }
    );

    try {
      await this.logEvent(fileId, 'DELETED', { delete_type: 'soft' }, user_id);
    } catch (e) {
      console.error('Failed to log DELETED event', e);
    }

    await this.logEvent(fileId, 'DELETED', {}, user_id);

    return true;
  }

  /**
   * Prepare upload by creating a pending file record
   * @param {Object} metadata 
   */
  async prepareUpload(metadata) {
    const table = await this.getFileMetadataTable();

    const record = {
      file_id: metadata.file_id,
      tenant_id: metadata.tenant_id,
      folder_id: metadata.folder_id,
      storage_backend_id: metadata.storage_backend_id,
      title: metadata.title || metadata.original_filename,
      original_filename: metadata.original_filename,
      content_type: metadata.content_type || 'application/octet-stream',
      size_bytes: metadata.size_bytes || 0,
      object_key: metadata.object_key,
      document_type: metadata.document_type || 'other',
      record_status: 'upload',
      record_sub_status: 'pending',
      visibility: metadata.visibility || 'private',
      general_access: metadata.general_access || 'restricted',
      created_by: metadata.user_id,
      created_dt: new Date(),
      updated_by: metadata.user_id,
      updated_dt: new Date()
    };

    // Insert into DB
    // Assuming table.insert takes the object
    await table.insert(record);
    return record;
  }

  /**
   * Finalize upload by updating status and size
   * @param {string} fileId 
   * @param {string} tenantId 
   * @param {Object} details { size_bytes, checksum_sha256, user_id } 
   */
  async finalizeUpload(fileId, tenantId, details) {
    const table = await this.getFileMetadataTable();

    const updateData = {
      record_sub_status: 'completed',
      size_bytes: details.size_bytes,
      updated_by: details.user_id,
      updated_dt: new Date()
    };

    if (details.checksum_sha256) {
      updateData.checksum_sha256 = details.checksum_sha256;
    }

    const db = table.adapter; // Access adapter directly from table instance if getter not present
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const query = new Update(db);
    query.table(table.getTableName())
      .set(updateData)
      .where('file_id = ?', fileId)
      .where('tenant_id = ?', tenantId)
      .where('deleted_at IS NULL');

    await query.execute();

    await this.logEvent(fileId, 'UPLOADED', { size_bytes: details.size_bytes }, details.user_id);

    return true;
  }

  /**
   * Mark upload as failed
   * @param {string} fileId 
   * @param {string} tenantId 
   * @param {string} userId 
   */
  async failUpload(fileId, tenantId, userId) {
    const table = await this.getFileMetadataTable();
    const db = table.adapter;
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const query = new Update(db);
    query.table(table.getTableName())
      .set({
        record_sub_status: 'failed',
        updated_by: userId,
        updated_dt: new Date()
      })
      .where('file_id = ?', fileId)
      .where('tenant_id = ?', tenantId)
      .where('deleted_at IS NULL');

    await query.execute();
    return true;
  }

  /**
   * Rename a file
   * @param {string} fileId
   * @param {string} name
   * @param {string} userEmail
   */
  async updateFile(fileId, name, userEmail) {
    const adapter = await this.initializeDatabase();
    const Select = require(global.applicationPath('/library/db/sql/select'));

    // 1. Validate User
    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, ['u.user_id', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', userEmail);
    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

    if (userRows.length === 0) throw new Error('User not found');
    const { user_id, tenant_id } = userRows[0];

    // 2. Validate File Ownership/Tenant
    const table = await this.getFileMetadataTable();
    const file = await table.fetchById(fileId);

    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    // 3. Update Name (title)
    // Note: 'title' is the display name, 'original_filename' usually stays same?
    // Let's update 'title' as that's what is displayed.
    const now = new Date();
    await table.update(
      { file_id: fileId },
      {
        title: name,
        updated_by: user_id,
        updated_dt: now
      }
    );

    await this.logEvent(fileId, 'RENAMED', {
      old_name: file.getTitle(),
      new_name: name
    }, user_id);

    return true;
  }

  /**
   * Log a file event
   * @param {string} fileId
   * @param {string} eventType
   * @param {Object} detail
   * @param {string} userId
   */
  async logEvent(fileId, eventType, detail, userId) {
    const FileEventEntity = require('../entity/file-event-entity');

    // Validate event type
    if (!Object.keys(FileEventEntity.EVENT_TYPE).includes(eventType)) {
      console.warn(`[FileMetadataService] Invalid event type: ${eventType}`);
      // Fallback or throw? Let's just warn for now to not break flow, or maybe throw.
      // The entity validation will also catch this.
    }

    const adapter = await this.initializeDatabase();
    const FileEventTable = require('../table/file-event-table');
    const eventTable = new FileEventTable({ adapter });

    // Use SQL insert directly or table insert
    // Table insert expects an object/entity
    // The detail field is JSONB, so we need to ensure it's passed correctly.
    // TableGateway.insert usually handles basic KV pairs.

    await eventTable.insert({
      file_id: fileId,
      event_type: eventType,
      detail: JSON.stringify(detail), // DB adapter should handle object->json if mapped, but stringify to be safe for now or rely on driver
      actor_user_id: userId,
      created_dt: new Date()
    });
  }
}

module.exports = FileMetadataService;
