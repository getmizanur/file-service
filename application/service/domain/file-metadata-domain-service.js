// application/service/domain/file-metadata-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class FileMetadataService extends AbstractDomainService {
  _invalidateFileCache(tenantId) {
    this.getServiceManager().get('QueryCacheService').onFileChanged(tenantId).catch(() => {});
  }

  _invalidatePermissionCache(tenantId) {
    this.getServiceManager().get('QueryCacheService').onPermissionChanged(tenantId).catch(() => {});
  }

  _invalidateSuggestionCache(tenantId, userId) {
    this._getAdapter().query(
      `DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    ).catch(() => {});
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

  async getFilesByFolder(email, folderId, limit = null, offset = 0, sortMode = 'name') {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchFilesByFolder(email, folderId, limit, offset, sortMode);
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

  async searchFiles(tenantId, userId, searchTerm, limit = 20, offset = 0, { fileExtension = null, intitle = null, allintitle = null, author = null } = {}) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchSearchResults(tenantId, userId, searchTerm, limit, offset, { fileExtension, intitle, allintitle, author });
  }

  async searchFilesCount(tenantId, userId, searchTerm, { fileExtension = null, intitle = null, allintitle = null, author = null } = {}) {
    const table = await this.getTable('FileMetadataTable');
    return table.fetchSearchResultsCount(tenantId, userId, searchTerm, { fileExtension, intitle, allintitle, author });
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
    this._invalidateFileCache(tenant_id);

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
    this._invalidateFileCache(tenant_id);

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
      storage_uri: metadata.storage_uri || null,
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

    try {
      await this.getServiceManager().get('UsageDailyService')
        .recordUpload(tenantId, details.size_bytes || 0);
    } catch (e) {
      console.error('[FileMetadataService] Failed to record upload usage:', e.message);
    }
    this._invalidateFileCache(tenantId);

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
    this._invalidateFileCache(tenant_id);

    return true;
  }

  async copyFile(fileId, targetFolderId, userEmail, { invalidationContext } = {}) {
    const crypto = require('node:crypto');
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);

    const table = await this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    // Validate target folder
    const folderTable = sm.get('FolderTable');
    const targetFolder = await folderTable.fetchById(targetFolderId);
    if (!targetFolder) throw new Error('Destination folder not found');
    const folderTenant = (typeof targetFolder.getTenantId === 'function')
      ? targetFolder.getTenantId() : targetFolder.tenant_id;
    if (folderTenant !== tenant_id) throw new Error('Access denied to destination folder');

    // Generate new file ID and object key
    const newFileId = crypto.randomUUID();
    const storageService = sm.get('StorageService');
    const { backend: destBackend, keyTemplate } = await storageService.resolveBackendForTenant(tenant_id);

    const sanitizedFilename = (file.getOriginalFilename() || file.getTitle() || 'file')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const newObjectKey = storageService.interpolateKeyTemplate(keyTemplate, {
      tenant_id,
      folder_id: targetFolderId,
      file_id: newFileId,
      sanitized_filename: sanitizedFilename
    });

    // Copy file content in storage — read from source file's backend, write to tenant's current backend
    const sourceBackend = await storageService.getBackend(file.getStorageBackendId());
    const sourceObjectKey = file.getObjectKey();
    if (!sourceObjectKey) throw new Error('Source file has no storage key');

    let sourceStream;
    try {
      sourceStream = await storageService.read(sourceBackend, sourceObjectKey);
    } catch (readErr) {
      console.error(
        `[FileMetadataService] Storage object missing — file_id=${fileId} ` +
        `storage_backend_id=${file.getStorageBackendId()} object_key=${sourceObjectKey}: ${readErr.message}`
      );
      throw new Error('File content is missing from storage and could not be copied.');
    }

    await storageService.write(sourceStream, destBackend, newObjectKey, {
      sizeBytes: file.getSizeBytes() || 0,
      contentType: file.getContentType() || 'application/octet-stream'
    });

    const newStorageUri = storageService.buildStorageUri(newObjectKey, destBackend);

    // Create new file metadata record
    const now = this._now();
    const newRecord = {
      file_id: newFileId,
      tenant_id,
      folder_id: targetFolderId,
      storage_backend_id: destBackend.getStorageBackendId(),
      title: file.getTitle(),
      original_filename: file.getOriginalFilename(),
      content_type: file.getContentType(),
      size_bytes: file.getSizeBytes(),
      object_key: newObjectKey,
      storage_uri: newStorageUri,
      document_type: file.getDocumentType(),
      record_status: 'upload',
      record_sub_status: 'completed',
      visibility: 'private',
      general_access: 'restricted',
      created_by: user_id,
      created_dt: now,
      updated_by: user_id,
      updated_dt: now
    };

    await table.insert(newRecord);

    // Grant owner permission on the copy
    await sm.get('FilePermissionTable').upsertPermission(
      tenant_id, newFileId, user_id, 'owner', user_id
    );

    // Copy derivatives (thumbnails, preview pages)
    try {
      const derivativeTable = sm.get('FileDerivativeTable');
      const derivatives = await derivativeTable.fetchByFileId(fileId);
      const readyDerivatives = derivatives.filter(d => d.getStatus() === 'ready');

      const tenantPolicyTable = sm.get('TenantPolicyTable');
      const policy = await tenantPolicyTable.fetchByTenantId(tenant_id);
      const derivativeKeyTemplate = (policy && policy.getDerivativeKeyTemplate())
        || 'tenants/{tenant_id}/derivatives/{file_id}/{kind}_{spec}.{ext}';
      const destBackendId = destBackend.getStorageBackendId();

      for (const deriv of readyDerivatives) {
        const kind = deriv.getKind();
        const spec = deriv.getSpec() || {};
        const specString = `${spec.format || 'webp'}${spec.size || ''}`;
        const ext = spec.format || 'webp';

        const newDerivKey = storageService.interpolateKeyTemplate(derivativeKeyTemplate, {
          tenant_id, file_id: newFileId, kind, spec: specString, ext
        });
        const newDerivUri = storageService.buildStorageUri(newDerivKey, destBackend);

        // Step 1: Upsert derivative record as pending
        const pendingRecord = await derivativeTable.upsertDerivative({
          fileId: newFileId,
          kind,
          spec,
          storageBackendId: destBackendId,
          objectKey: newDerivKey,
          storageUri: newDerivUri,
          sizeBytes: deriv.getSizeBytes(),
          status: 'pending',
          manifest: deriv.getManifest() || null
        });

        const derivId = pendingRecord && pendingRecord.getDerivativeId
          ? pendingRecord.getDerivativeId() : null;

        // Step 2: Attempt storage copy
        try {
          const derivSourceBackend = await storageService.getBackend(deriv.getStorageBackendId());
          const derivStream = await storageService.read(derivSourceBackend, deriv.getObjectKey());
          await storageService.write(derivStream, destBackend, newDerivKey, {
            sizeBytes: deriv.getSizeBytes() || 0,
            contentType: 'image/webp'
          });

          // Handle preview_pages manifest — copy page images and update object_keys
          let manifest = deriv.getManifest();
          if (kind === 'preview_pages' && manifest && manifest.pages) {
            const newPages = [];
            for (const page of manifest.pages) {
              const pageKey = storageService.interpolateKeyTemplate(
                'tenants/{tenant_id}/derivatives/{file_id}/preview_pages/{page}.webp',
                { tenant_id, file_id: newFileId, page: page.page }
              );
              const pageStream = await storageService.read(derivSourceBackend, page.object_key);
              await storageService.write(pageStream, destBackend, pageKey, {
                sizeBytes: 0, contentType: 'image/webp'
              });
              newPages.push({ ...page, object_key: pageKey });
            }
            manifest = { ...manifest, pages: newPages };
          }

          // Step 3a: Mark ready on success
          await derivativeTable.upsertDerivative({
            fileId: newFileId,
            kind,
            spec,
            storageBackendId: destBackendId,
            objectKey: newDerivKey,
            storageUri: newDerivUri,
            sizeBytes: deriv.getSizeBytes(),
            status: 'ready',
            readyDt: now,
            manifest: manifest || null
          });
        } catch (copyErr) {
          // Step 3b: Mark failed — record is preserved for retry
          console.error(`[FileMetadataService] Derivative copy failed (${kind} ${specString}):`, copyErr.message);
          if (derivId) {
            await derivativeTable.upsertDerivative({
              fileId: newFileId,
              kind,
              spec,
              storageBackendId: destBackendId,
              objectKey: newDerivKey,
              storageUri: newDerivUri,
              status: 'failed',
              errorDetail: copyErr.message,
              lastAttemptDt: now
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Outer failure (e.g. cannot fetch derivatives) should not block the file copy
      console.error(`[FileMetadataService] Failed to copy derivatives for ${fileId}:`, e.message);
    }

    await this.logEvent(newFileId, 'COPIED', {
      source_file_id: fileId,
      target_folder_id: targetFolderId
    }, user_id);

    if (invalidationContext) {
      invalidationContext.markFileCache(tenant_id);
      invalidationContext.markSuggestionsStale(tenant_id, user_id);
    } else {
      this._invalidateFileCache(tenant_id);
      this._invalidateSuggestionCache(tenant_id, user_id);
    }

    return { file_id: newFileId };
  }

  async moveFile(fileId, targetFolderId, userEmail, { invalidationContext } = {}) {
    const { user_id, tenant_id } =
      await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);

    const table = await this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);

    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');

    const oldFolderId = file.getFolderId();

    if (targetFolderId) {
      const folderTable = this.getServiceManager().get('FolderTable');
      const targetFolder = await folderTable.fetchById(targetFolderId);
      if (!targetFolder) throw new Error('Destination folder not found');

      const folderTenant = (typeof targetFolder.getTenantId === 'function')
        ? targetFolder.getTenantId()
        : targetFolder.tenant_id;

      if (folderTenant !== tenant_id) throw new Error('Access denied to destination folder');
    } else {
      const folderService = this.getServiceManager().get('FolderService');
      const rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
      if (!rootFolder) throw new Error('Root folder not found');
      targetFolderId = rootFolder.getFolderId();
    }

    const now = this._now();
    await table.update(
      { file_id: fileId },
      { folder_id: targetFolderId, updated_by: user_id, updated_dt: now }
    );

    await this.logEvent(fileId, 'MOVED', {
      from_folder_id: oldFolderId,
      to_folder_id: targetFolderId
    }, user_id);

    if (invalidationContext) {
      invalidationContext.markFileCache(tenant_id);
      invalidationContext.markSuggestionsStale(tenant_id, user_id);
    } else {
      this._invalidateFileCache(tenant_id);
      this._invalidateSuggestionCache(tenant_id, user_id);
    }

    return true;
  }

  async permanentDeleteFile(fileId, userEmail) {
    const { user_id, tenant_id } = await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);
    const table = await this.getTable('FileMetadataTable');
    const file = await table.fetchByIdIncludeDeleted(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== tenant_id) throw new Error('Access denied');
    if (!file.getDeletedAt()) throw new Error('File is not in trash');

    // Audit BEFORE hard delete — row survives the cascade
    try {
      const Insert = require(globalThis.applicationPath('/library/db/sql/insert'));
      const insert = new Insert(this._getAdapter());
      insert.into('deletion_audit').set({
        tenant_id,
        asset_type: 'file',
        asset_id: fileId,
        object_key: file.getObjectKey() || null,
        actor_user_id: user_id,
        mode: 'permanent',
        detail: JSON.stringify({ title: file.getTitle() })
      });
      await insert.execute();
    } catch (e) {
      console.error('[FileMetadataService] deletion_audit insert failed:', e.message);
    }

    await table.delete({ file_id: fileId });
    this._invalidateFileCache(tenant_id);
    return true;
  }

  async emptyTrash(userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const table = await this.getTable('FileMetadataTable');
    const folderTable = sm.get('FolderTable');
    const adapter = this._getAdapter();

    // Audit all trashed items BEFORE hard delete
    try {
      await adapter.query(
        `INSERT INTO deletion_audit (tenant_id, asset_type, asset_id, object_key, actor_user_id, mode, detail)
         SELECT tenant_id, 'file', file_id, object_key, $1, 'empty_trash', '{}'::jsonb
         FROM file_metadata
         WHERE tenant_id = $2 AND deleted_at IS NOT NULL`,
        [user_id, tenant_id]
      );
      await adapter.query(
        `INSERT INTO deletion_audit (tenant_id, asset_type, asset_id, object_key, actor_user_id, mode, detail)
         SELECT tenant_id, 'folder', folder_id, NULL, $1, 'empty_trash', '{}'::jsonb
         FROM folder
         WHERE tenant_id = $2 AND deleted_at IS NOT NULL`,
        [user_id, tenant_id]
      );
    } catch (e) {
      console.error('[FileMetadataService] deletion_audit bulk insert failed:', e.message);
    }

    // Files first (FK: file_metadata.folder_id → folder ON DELETE SET NULL, so order matters)
    await table.deleteAllTrashed(tenant_id);
    await folderTable.deleteAllTrashed(tenant_id);
    this._invalidateFileCache(tenant_id);
    return true;
  }

  async restoreAllTrashed(userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const table = await this.getTable('FileMetadataTable');
    const folderTable = sm.get('FolderTable');
    await table.restoreAllTrashed(tenant_id, user_id);
    await folderTable.restoreAllTrashed(tenant_id, user_id);
    this._invalidateFileCache(tenant_id);
    return true;
  }

  async calculateSize(items, userEmail) {
    const { tenant_id } = await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);

    const fileIds   = items.filter(i => i.type === 'file').map(i => i.id);
    const folderIds = items.filter(i => i.type === 'folder').map(i => i.id);

    const table = await this.getTable('FileMetadataTable');
    return table.calculateSize(fileIds, folderIds, tenant_id);
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
    this._invalidatePermissionCache(tenantId);

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
    this._invalidatePermissionCache(actor.tenant_id);

    return true;
  }

  // ------------------------------------------------------------
  // Public link create/revoke
  // ------------------------------------------------------------

  async createPublicLink(fileId, actorEmail, { role = 'viewer', password = null, expires = null } = {}) {
    const sm = this.getServiceManager();
    const actor = await sm.get('AppUserTable').fetchWithTenantByEmail(actorEmail);
    if (!actor) throw new Error(`User not found: ${actorEmail}`);

    const file = await this.getTable('FileMetadataTable').fetchById(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== actor.tenant_id) throw new Error('Access denied');

    const actorPerm = await sm.get('FilePermissionTable').fetchByUserAndFile(actor.tenant_id, fileId, actor.user_id);
    if (!actorPerm || actorPerm.getRole() === 'viewer') throw new Error('You do not have permission to manage link sharing');

    const adapter = this._getAdapter();
    const Update = require(globalThis.applicationPath('/library/db/sql/update'));

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
    const crypto = require('node:crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await shareLinkTable.create({
      tenant_id: actor.tenant_id,
      file_id: fileId,
      token_hash: tokenHash,
      role: role,
      password_hash: password ?? null,
      expires_dt: expires ?? null,
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

    const file = await this.getTable('FileMetadataTable').fetchById(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== actor.tenant_id) throw new Error('Access denied');

    const actorPerm = await sm.get('FilePermissionTable').fetchByUserAndFile(actor.tenant_id, fileId, actor.user_id);
    if (!actorPerm || actorPerm.getRole() === 'viewer') throw new Error('You do not have permission to manage link sharing');

    const adapter = this._getAdapter();
    const Update = require(globalThis.applicationPath('/library/db/sql/update'));

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
  // Publish / Unpublish (public_key)
  // ------------------------------------------------------------

  async publishFile(fileId, actorEmail) {
    const sm = this.getServiceManager();
    const actor = await sm.get('AppUserTable').fetchWithTenantByEmail(actorEmail);
    if (!actor) throw new Error(`User not found: ${actorEmail}`);

    const table = this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== actor.tenant_id) throw new Error('Access denied');

    // If already published, ensure visibility is public and return existing key
    const existingKey = file.getPublicKey();
    if (existingKey) {
      if (file.getVisibility() !== 'public') {
        const Update = require(globalThis.applicationPath('/library/db/sql/update'));
        const upd = new Update(this._getAdapter());
        upd.table('file_metadata')
          .set({ visibility: 'public', updated_by: actor.user_id, updated_dt: this._now() })
          .where('file_id = ?', fileId);
        await upd.execute();
        this._invalidateFileCache(actor.tenant_id);
      }
      return existingKey;
    }

    // Generate a short unique public key
    const crypto = require('node:crypto');
    const publicKey = crypto.randomBytes(16).toString('hex');

    const Update = require(globalThis.applicationPath('/library/db/sql/update'));
    const adapter = this._getAdapter();
    const update = new Update(adapter);
    update.table('file_metadata')
      .set({
        public_key: publicKey,
        visibility: 'public',
        updated_by: actor.user_id,
        updated_dt: this._now()
      })
      .where('file_id = ?', fileId);

    await update.execute();

    await this.logEvent(fileId, 'METADATA_UPDATED', {
      action: 'published',
      public_key: publicKey
    }, actor.user_id);

    this._invalidateFileCache(actor.tenant_id);
    this._getAdapter().query(
      `DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND asset_type = 'file' AND asset_id = $2`,
      [actor.tenant_id, fileId]
    ).catch(() => {});
    return publicKey;
  }

  async unpublishFile(fileId, actorEmail) {
    const sm = this.getServiceManager();
    const actor = await sm.get('AppUserTable').fetchWithTenantByEmail(actorEmail);
    if (!actor) throw new Error(`User not found: ${actorEmail}`);

    const table = this.getTable('FileMetadataTable');
    const file = await table.fetchById(fileId);
    if (!file) throw new Error('File not found');
    if (file.getTenantId() !== actor.tenant_id) throw new Error('Access denied');

    const Update = require(globalThis.applicationPath('/library/db/sql/update'));
    const adapter = this._getAdapter();
    const update = new Update(adapter);
    update.table('file_metadata')
      .set({
        visibility: 'private',
        updated_by: actor.user_id,
        updated_dt: this._now()
      })
      .where('file_id = ?', fileId);

    await update.execute();

    await this.logEvent(fileId, 'METADATA_UPDATED', {
      action: 'unpublished'
    }, actor.user_id);

    this._invalidateFileCache(actor.tenant_id);
    this._getAdapter().query(
      `DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND asset_type = 'file' AND asset_id = $2`,
      [actor.tenant_id, fileId]
    ).catch(() => {});
    return true;
  }

  // ------------------------------------------------------------
  // Share dialog reads
  // ------------------------------------------------------------

  async getFilePermissions(fileId, tenantId) {
    const sm = this.getServiceManager();
    const permTable = sm.get('FilePermissionTable');
    let permissions = await permTable.fetchUsersWithAccess(tenantId, fileId);

    if (!permissions || permissions.length === 0) {
      const meta = await this.getTable('FileMetadataTable').fetchById(fileId);
      if (meta?.getCreatedBy()) {
        await permTable.upsertPermission(tenantId, fileId, meta.getCreatedBy(), 'owner', meta.getCreatedBy());
        permissions = await permTable.fetchUsersWithAccess(tenantId, fileId);
      }
    }

    return permissions;
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
