// application/service/domain/file-metadata-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class FileMetadataService extends AbstractDomainService {
  constructor() {
    super();
  }

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  _normalizeRows(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.rows)) return result.rows;
    return [];
  }

  _now() {
    return new Date();
  }

  _getAdapter() {
    return this.getServiceManager().get('DbAdapter');
  }

  // ------------------------------------------------------------
  // Simple delegations to table
  // ------------------------------------------------------------

  async getFilesByFolder(email, folderId, limit = null, offset = 0) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchFilesByFolder(email, folderId, limit, offset);
  }

  async getFilesByFolderCount(email, folderId) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchFilesByFolderCount(email, folderId);
  }

  async getFilesByIds(ids) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchByIds(ids);
  }

  async getRecentFiles(email, limit = 50, tenantId = null) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchRecent(email, limit, tenantId);
  }

  async getSharedFiles(email, limit = 50) {
    const user = await this.getServiceManager().get('AppUserTable').fetchWithTenantByEmail(email);
    if (!user) return [];
    const table = await this.getTable('FileMetadataTable');
    return table.fetchSharedWithMe(user.user_id, user.tenant_id, limit, 0);
  }

  async searchFiles(tenantId, userId, searchTerm, limit = 20, offset = 0) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchSearchResults(tenantId, userId, searchTerm, limit, offset);
  }

  async searchFilesCount(tenantId, userId, searchTerm) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchSearchResultsCount(tenantId, userId, searchTerm);
  }

  async getDeletedFiles(userEmail) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchDeletedFiles(userEmail);
  }

  // ------------------------------------------------------------
  // File operations
  // ------------------------------------------------------------

  async deleteFile(fileId, userEmail) {
    const { user_id, tenant_id } =
      await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);

    const table = await this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    const now = this._now();
    await table.update(
      { file_id: fileId },
      { deleted_at: now, deleted_by: user_id }
    );

    try {
      await this.logEvent(fileId, 'DELETED', { delete_type: 'soft' }, user_id);
    } catch (e) {
      console.error('Failed to log DELETED event', e);
    }

    return true;
  }

  async restoreFile(fileId, userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const table = await this.getTable('FileMetadataTable');

    const file = await table.fetchByIdIncludeDeleted(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');
    if (!file.getDeletedAt()) throw new Error('File is not in trash');

    await table.update({ file_id: fileId }, { deleted_at: null, deleted_by: null });

    try {
      await this.logEvent(fileId, 'RESTORED', { action: 'restored' }, user_id);
    } catch (e) {
      console.error('Failed to log RESTORED event', e);
    }

    return true;
  }

  async prepareUpload(metadata) {
    const table = await this.getTable('FileMetadataTable');

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
      created_dt: this._now(),
      updated_by: metadata.user_id,
      updated_dt: this._now()
    };

    await table.insert(record);

    await this.getServiceManager().get('FilePermissionTable').upsertPermission(
      metadata.tenant_id,
      metadata.file_id,
      metadata.user_id,
      'owner',
      metadata.user_id
    );

    await this.logEvent(
      metadata.file_id,
      'UPLOAD_INITIATED',
      { filename: metadata.original_filename },
      metadata.user_id
    );

    return record;
  }

  async finalizeUpload(fileId, tenantId, details) {
    const table = await this.getTable('FileMetadataTable');

    const updateData = {
      record_sub_status: 'completed',
      size_bytes: details.size_bytes,
      updated_by: details.user_id,
      updated_dt: this._now()
    };
    if (details.checksum_sha256) updateData.checksum_sha256 = details.checksum_sha256;

    await table.updateSubStatus(fileId, tenantId, updateData);

    const file = await table.fetchById(fileId);
    await this.logEvent(
      fileId,
      'UPLOAD_COMPLETED',
      {
        filename: file.getOriginalFilename(),
        size_bytes: details.size_bytes,
        content_type: file.getContentType()
      },
      details.user_id
    );

    return true;
  }

  async failUpload(fileId, tenantId, userId) {
    const table = await this.getTable('FileMetadataTable');
    await table.updateSubStatus(fileId, tenantId, {
      record_sub_status: 'failed',
      updated_by: userId,
      updated_dt: this._now()
    });
    return true;
  }

  async updateFile(fileId, name, userEmail) {
    const { user_id, tenant_id } =
      await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);

    const table = await this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    const now = this._now();
    await table.update(
      { file_id: fileId },
      { title: name, updated_by: user_id, updated_dt: now }
    );

    await this.logEvent(fileId, 'RENAMED', {
      old_name: file.getTitle(),
      new_name: name
    }, user_id);

    return true;
  }

  async moveFile(fileId, targetFolderId, userEmail) {
    const { user_id, tenant_id } =
      await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);

    const table = await this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    const oldFolderId = file.getFolderId();

    if (!targetFolderId) {
      const folderService = this.getServiceManager().get('FolderService');
      const rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
      if (!rootFolder) throw new Error('Root folder not found');
      targetFolderId = rootFolder.getFolderId();
    } else {
      const folderTable = this.getServiceManager().get('FolderTable');
      const targetFolder = await folderTable.fetchById(targetFolderId);
      if (!targetFolder) throw new Error('Destination folder not found');

      const folderTenant = (typeof targetFolder.getTenantId === 'function')
        ? targetFolder.getTenantId()
        : targetFolder.tenant_id;

      if (folderTenant !== tenant_id) throw new Error('Access denied to destination folder');
    }

    const now = this._now();
    await table.update(
      { file_id: fileId },
      { folder_id: targetFolderId, updated_by: user_id, updated_dt: now }
    );

    await this.logEvent(fileId, 'METADATA_UPDATED', {
      action: 'moved',
      from_folder_id: oldFolderId,
      to_folder_id: targetFolderId
    }, user_id);

    return true;
  }

  // ------------------------------------------------------------
  // Events
  // ------------------------------------------------------------

  async logEvent(fileId, eventType, detail, userId) {
    await this.getServiceManager().get('FileEventTable').insertEvent(fileId, eventType, detail, userId);
  }

  // ------------------------------------------------------------
  // Sharing
  // ------------------------------------------------------------

  async shareFileWithUser(fileId, targetEmail, role, actorUserId, tenantId) {
    const sm = this.getServiceManager();

    // 1) Check actor's role on this file
    const permTable = sm.get('FilePermissionTable');
    const actorPerm = await permTable.fetchByUserAndFile(tenantId, fileId, actorUserId);
    if (!actorPerm) throw new Error('Access denied');

    const actorRole = actorPerm.getRole();
    if (actorRole === 'viewer') throw new Error('You do not have permission to share this file');

    // 2) Resolve target user in same tenant
    const target = await sm.get('AppUserTable').fetchByEmailInTenant(tenantId, targetEmail);
    if (!target) throw new Error('User not found or not in tenant');
    const targetUserId = target.user_id;

    // 3) No one may change their own role via this endpoint
    if (String(targetUserId) === String(actorUserId)) {
      throw new Error('You cannot change your own role');
    }

    // 5) Check existing permission on target
    const existingPerm = await permTable.fetchByUserAndFile(tenantId, fileId, targetUserId);
    const existingRole = existingPerm ? existingPerm.getRole() : null;

    // 6) Editors cannot modify the owner's row or grant the owner role
    if (actorRole === 'editor') {
      if (existingRole === 'owner') throw new Error('Cannot modify the file owner\'s role');
      if (role === 'owner') throw new Error('Cannot grant owner role');
    }

    // 7) Upsert permission
    await permTable.upsertPermission(tenantId, fileId, targetUserId, role, actorUserId);

    // 8) Event
    if (existingRole && existingRole !== role) {
      await this.logEvent(fileId, 'PERMISSION_UPDATED', {
        target_user_id: targetUserId,
        old_role: existingRole,
        new_role: role
      }, actorUserId);
    } else if (!existingRole) {
      await this.logEvent(fileId, 'ACCESS_GRANTED', {
        target_user_id: targetUserId,
        role: role
      }, actorUserId);
    }

    return true;
  }

  async removeUserAccess(fileId, targetUserId, actorEmail) {
    const sm = this.getServiceManager();
    const actor = await sm.get('AppUserTable').fetchWithTenantByEmail(actorEmail);
    if (!actor) throw new Error('Actor not found');

    const permTable = sm.get('FilePermissionTable');

    // Check actor's role on this file
    const actorPerm = await permTable.fetchByUserAndFile(actor.tenant_id, fileId, actor.user_id);
    if (!actorPerm) throw new Error('Access denied');

    const actorRole = actorPerm.getRole();
    if (actorRole === 'viewer') throw new Error('You do not have permission to manage access');

    const existing = await permTable.fetchByUserAndFile(actor.tenant_id, fileId, targetUserId);
    if (!existing) return false;

    const oldRole = existing.getRole();

    // Editors cannot remove the owner's access
    if (actorRole === 'editor' && oldRole === 'owner') {
      throw new Error('Cannot remove the file owner\'s access');
    }

    await permTable.deleteByFileAndUser(actor.tenant_id, fileId, targetUserId);

    await this.logEvent(fileId, 'PERMISSION_UPDATED', {
      target_user_id: targetUserId,
      action: 'removed',
      old_role: oldRole
    }, actor.user_id);

    return true;
  }

  // ------------------------------------------------------------
  // Public link create/revoke
  // ------------------------------------------------------------

  async createPublicLink(fileId, actorEmail, { role = 'viewer', password = null, expires = null } = {}) {
    const sm = this.getServiceManager();
    const actor = await sm.get('AppUserTable').fetchWithTenantByEmail(actorEmail);
    if (!actor) throw new Error(`User not found: ${actorEmail}`);

    const adapter = this._getAdapter();
    const Update = require(global.applicationPath('/library/db/sql/update'));

    // 1) Update metadata general_access
    const metaUpdate = new Update(adapter);
    metaUpdate.table('file_metadata')
      .set({
        general_access: 'anyone_with_link',
        updated_by: actor.user_id,
        updated_dt: this._now()
      })
      .where('file_id = ?', fileId);

    await metaUpdate.execute();

    // 2) Reuse existing active link if present
    const shareLinkTable = sm.get('ShareLinkTable');
    const existingLink = await shareLinkTable.fetchActiveByFileId(fileId);

    if (existingLink) {
      if (existingLink.getRole() !== role) {
        const slUpdate = new Update(adapter);
        slUpdate.table('share_link')
          .set({ role: role })
          .where('share_id = ?', existingLink.getShareId());
        await slUpdate.execute();

        await this.logEvent(fileId, 'PERMISSION_UPDATED', {
          scope: 'link',
          old_role: existingLink.getRole(),
          new_role: role
        }, actor.user_id);
      }

      return existingLink.getTokenHash();
    }

    // 3) Create new link
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await shareLinkTable.create({
      tenant_id: actor.tenant_id,
      file_id: fileId,
      token_hash: tokenHash,
      role: role,
      password_hash: password ? password : null,
      expires_dt: expires ? expires : null,
      created_by: actor.user_id,
      created_dt: this._now()
    });

    await this.logEvent(fileId, 'PERMISSION_UPDATED', {
      general_access: 'anyone_with_link',
      role,
      action: 'new_link'
    }, actor.user_id);

    return token;
  }

  async revokePublicLink(fileId, actorEmail) {
    const sm = this.getServiceManager();
    const actor = await sm.get('AppUserTable').fetchWithTenantByEmail(actorEmail);
    if (!actor) throw new Error(`User not found: ${actorEmail}`);

    const adapter = this._getAdapter();
    const Update = require(global.applicationPath('/library/db/sql/update'));

    // 1) Update metadata
    const metaUpdate = new Update(adapter);
    metaUpdate.table('file_metadata')
      .set({
        general_access: 'restricted',
        updated_by: actor.user_id,
        updated_dt: this._now()
      })
      .where('file_id = ?', fileId);

    await metaUpdate.execute();

    // 2) Revoke link(s)
    await sm.get('ShareLinkTable').revoke(actor.tenant_id, fileId);

    await this.logEvent(fileId, 'PERMISSION_UPDATED', {
      general_access: 'restricted',
      action: 'link_revoked'
    }, actor.user_id);

    return true;
  }

  // ------------------------------------------------------------
  // Share dialog reads
  // ------------------------------------------------------------

  async getFilePermissions(fileId, tenantId) {
    return this.getServiceManager().get('FilePermissionTable').fetchUsersWithAccess(tenantId, fileId);
  }

  async getActivePublicLink(fileId) {
    const link = await this.getServiceManager().get('ShareLinkTable').fetchActiveByFileId(fileId);
    if (!link) return null;

    return {
      share_id: link.getShareId(),
      token_hash: link.getTokenHash(),
      expires_dt: link.getExpiresDt(),
      revoked_dt: link.getRevokedDt(),
      role: link.getRole()
    };
  }

  async getFileSharingStatus(fileId) {
    const sm = this.getServiceManager();
    const meta = await this.getTable('FileMetadataTable').fetchById(fileId);
    if (!meta) return null;

    const link = await sm.get('ShareLinkTable').fetchActiveByFileId(fileId);

    return {
      general_access: meta.getGeneralAccess(),
      tenant_id: meta.getTenantId(),
      share_id: link ? link.getShareId() : null,
      token_hash: link ? link.getTokenHash() : null,
      expires_dt: link ? link.getExpiresDt() : null,
      revoked_dt: link ? link.getRevokedDt() : null,
      role: link ? link.getRole() : null
    };
  }
}

module.exports = FileMetadataService;
