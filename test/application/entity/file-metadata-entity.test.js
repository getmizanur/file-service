const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileMetadataEntity;
beforeAll(() => {
  FileMetadataEntity = require(globalThis.applicationPath('/application/entity/file-metadata-entity'));
});

describe('FileMetadataEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data and have defaults', () => {
      const entity = new FileMetadataEntity();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getFolderId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getIntegrationId()).toBeNull();
      expect(entity.getStorageBackendId()).toBeNull();
      expect(entity.getTitle()).toBeNull();
      expect(entity.getDescription()).toBeNull();
      expect(entity.getApplicationRefId()).toBeNull();
      expect(entity.getDocumentType()).toBeNull();
      expect(entity.getDocumentTypeId()).toBeNull();
      expect(entity.getObjectKey()).toBeNull();
      expect(entity.getStorageUri()).toBeNull();
      expect(entity.getOriginalFilename()).toBeNull();
      expect(entity.getContentType()).toBeNull();
      expect(entity.getSizeBytes()).toBeNull();
      expect(entity.getChecksumSha256()).toBeNull();
      expect(entity.getRetentionDays()).toBeNull();
      expect(entity.getExpiresAt()).toBeNull();
      expect(entity.getGdprFlag()).toBe('false');
      expect(entity.getRecordStatus()).toBe('upload');
      expect(entity.getRecordSubStatus()).toBe('pending');
      expect(entity.getRequestCount()).toBe(0);
      expect(entity.getVisibility()).toBe('private');
      expect(entity.getGeneralAccess()).toBe('restricted');
      expect(entity.getDeletedAt()).toBeNull();
      expect(entity.getDeletedBy()).toBeNull();
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getUpdatedBy()).toBeNull();
      expect(entity.getUpdatedDt()).toBeNull();
      expect(entity.getPublicKey()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        file_id: 'file-1',
        folder_id: 'folder-1',
        tenant_id: 'tenant-1',
        storage_backend_id: 'sb-1',
        title: 'Test File',
        original_filename: 'test.pdf',
        content_type: 'application/pdf',
        size_bytes: 1024,
        record_status: 'upload',
        visibility: 'private'
      };
      const entity = new FileMetadataEntity(data);
      expect(entity.getFileId()).toBe('file-1');
      expect(entity.getFolderId()).toBe('folder-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getStorageBackendId()).toBe('sb-1');
      expect(entity.getTitle()).toBe('Test File');
      expect(entity.getOriginalFilename()).toBe('test.pdf');
      expect(entity.getContentType()).toBe('application/pdf');
      expect(entity.getSizeBytes()).toBe(1024);
    });
  });

  describe('static constants', () => {
    it('should have correct RECORD_STATUS values', () => {
      expect(FileMetadataEntity.RECORD_STATUS).toEqual({
        UPLOAD: 'upload',
        DELETED: 'deleted'
      });
    });

    it('should have correct RECORD_SUB_STATUS values', () => {
      expect(FileMetadataEntity.RECORD_SUB_STATUS).toEqual({
        UPLOAD: 'upload',
        PENDING: 'pending',
        COMPLETED: 'completed',
        FAILED: 'failed',
        DELETED: 'deleted',
        GDPR: 'gdpr',
        RETENTION: 'retention',
        CUSTOMER: 'customer'
      });
    });

    it('should have correct GDPR_FLAG values', () => {
      expect(FileMetadataEntity.GDPR_FLAG).toEqual({
        FALSE: 'false',
        TRUE: 'true',
        DELETE: 'delete',
        PROTECT: 'protect'
      });
    });

    it('should have correct VISIBILITY values', () => {
      expect(FileMetadataEntity.VISIBILITY).toEqual({
        PRIVATE: 'private',
        PUBLIC: 'public'
      });
    });

    it('should have correct ACCESS values', () => {
      expect(FileMetadataEntity.ACCESS).toEqual({
        RESTRICTED: 'restricted',
        ANYONE: 'anyone_with_link'
      });
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FileMetadataEntity();
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-1');
      expect(entity.getFileId()).toBe('f-1');
    });

    it('should get/set folder_id', () => {
      entity.setFolderId('fld-1');
      expect(entity.getFolderId()).toBe('fld-1');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-1');
      expect(entity.getTenantId()).toBe('t-1');
    });

    it('should get/set integration_id', () => {
      entity.setIntegrationId('int-1');
      expect(entity.getIntegrationId()).toBe('int-1');
    });

    it('should get/set storage_backend_id', () => {
      entity.setStorageBackendId('sb-1');
      expect(entity.getStorageBackendId()).toBe('sb-1');
    });

    it('should get/set title', () => {
      entity.setTitle('My Title');
      expect(entity.getTitle()).toBe('My Title');
    });

    it('should get/set description', () => {
      entity.setDescription('A description');
      expect(entity.getDescription()).toBe('A description');
    });

    it('should get/set application_ref_id', () => {
      entity.setApplicationRefId('app-ref-1');
      expect(entity.getApplicationRefId()).toBe('app-ref-1');
    });

    it('should get/set document_type', () => {
      entity.setDocumentType('invoice');
      expect(entity.getDocumentType()).toBe('invoice');
    });

    it('should get/set document_type_id', () => {
      entity.setDocumentTypeId('dt-1');
      expect(entity.getDocumentTypeId()).toBe('dt-1');
    });

    it('should get/set object_key', () => {
      entity.setObjectKey('objects/key-1');
      expect(entity.getObjectKey()).toBe('objects/key-1');
    });

    it('should get/set storage_uri', () => {
      entity.setStorageUri('s3://bucket/key');
      expect(entity.getStorageUri()).toBe('s3://bucket/key');
    });

    it('should get/set original_filename', () => {
      entity.setOriginalFilename('report.pdf');
      expect(entity.getOriginalFilename()).toBe('report.pdf');
    });

    it('should get/set content_type', () => {
      entity.setContentType('application/pdf');
      expect(entity.getContentType()).toBe('application/pdf');
    });

    it('should get/set size_bytes', () => {
      entity.setSizeBytes(2048);
      expect(entity.getSizeBytes()).toBe(2048);
    });

    it('should get/set checksum_sha256', () => {
      entity.setChecksumSha256('abc123hash');
      expect(entity.getChecksumSha256()).toBe('abc123hash');
    });

    it('should get/set retention_days', () => {
      entity.setRetentionDays(90);
      expect(entity.getRetentionDays()).toBe(90);
    });

    it('should get/set expires_at', () => {
      entity.setExpiresAt('2025-12-31T23:59:59Z');
      expect(entity.getExpiresAt()).toBe('2025-12-31T23:59:59Z');
    });

    it('should get/set request_count', () => {
      entity.setRequestCount(5);
      expect(entity.getRequestCount()).toBe(5);
    });

    it('should get/set deleted_at', () => {
      entity.setDeletedAt('2025-07-01T00:00:00Z');
      expect(entity.getDeletedAt()).toBe('2025-07-01T00:00:00Z');
    });

    it('should get/set deleted_by', () => {
      entity.setDeletedBy('user-1');
      expect(entity.getDeletedBy()).toBe('user-1');
    });

    it('should get/set created_by', () => {
      entity.setCreatedBy('user-2');
      expect(entity.getCreatedBy()).toBe('user-2');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-01-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });

    it('should get/set updated_by', () => {
      entity.setUpdatedBy('user-3');
      expect(entity.getUpdatedBy()).toBe('user-3');
    });

    it('should get/set updated_dt', () => {
      entity.setUpdatedDt('2025-06-01T00:00:00Z');
      expect(entity.getUpdatedDt()).toBe('2025-06-01T00:00:00Z');
    });

    it('should get/set public_key', () => {
      entity.setPublicKey('pk-abc-123');
      expect(entity.getPublicKey()).toBe('pk-abc-123');
    });
  });

  describe('enum-validating setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FileMetadataEntity();
    });

    it('should set valid record_status values', () => {
      entity.setRecordStatus('upload');
      expect(entity.getRecordStatus()).toBe('upload');
      entity.setRecordStatus('deleted');
      expect(entity.getRecordStatus()).toBe('deleted');
    });

    it('should throw on invalid record_status', () => {
      expect(() => entity.setRecordStatus('invalid')).toThrow('Invalid record_status: invalid');
    });

    it('should set valid record_sub_status values', () => {
      const validValues = ['upload', 'pending', 'completed', 'failed', 'deleted', 'gdpr', 'retention', 'customer'];
      validValues.forEach(val => {
        entity.setRecordSubStatus(val);
        expect(entity.getRecordSubStatus()).toBe(val);
      });
    });

    it('should throw on invalid record_sub_status', () => {
      expect(() => entity.setRecordSubStatus('bogus')).toThrow('Invalid record_sub_status: bogus');
    });

    it('should set valid gdpr_flag values', () => {
      const validValues = ['false', 'true', 'delete', 'protect'];
      validValues.forEach(val => {
        entity.setGdprFlag(val);
        expect(entity.getGdprFlag()).toBe(val);
      });
    });

    it('should throw on invalid gdpr_flag', () => {
      expect(() => entity.setGdprFlag('unknown')).toThrow('Invalid gdpr_flag: unknown');
    });

    it('should set valid visibility values', () => {
      entity.setVisibility('private');
      expect(entity.getVisibility()).toBe('private');
      entity.setVisibility('public');
      expect(entity.getVisibility()).toBe('public');
    });

    it('should throw on invalid visibility', () => {
      expect(() => entity.setVisibility('hidden')).toThrow('Invalid visibility: hidden');
    });

    it('should set valid general_access values', () => {
      entity.setGeneralAccess('restricted');
      expect(entity.getGeneralAccess()).toBe('restricted');
      entity.setGeneralAccess('anyone_with_link');
      expect(entity.getGeneralAccess()).toBe('anyone_with_link');
    });

    it('should throw on invalid general_access', () => {
      expect(() => entity.setGeneralAccess('open')).toThrow('Invalid access: open');
    });
  });

  describe('logic methods', () => {
    it('isDeleted() should return false when deleted_at is null', () => {
      const entity = new FileMetadataEntity();
      expect(entity.isDeleted()).toBe(false);
    });

    it('isDeleted() should return true when deleted_at is set', () => {
      const entity = new FileMetadataEntity({ deleted_at: '2025-07-01T00:00:00Z' });
      expect(entity.isDeleted()).toBe(true);
    });

    it('isUploaded() should return true when record_status is upload', () => {
      const entity = new FileMetadataEntity();
      expect(entity.isUploaded()).toBe(true);
    });

    it('isUploaded() should return false when record_status is deleted', () => {
      const entity = new FileMetadataEntity({ record_status: 'deleted' });
      expect(entity.isUploaded()).toBe(false);
    });

    it('isCompleted() should return false when record_sub_status is pending', () => {
      const entity = new FileMetadataEntity();
      expect(entity.isCompleted()).toBe(false);
    });

    it('isCompleted() should return true when record_sub_status is completed', () => {
      const entity = new FileMetadataEntity({ record_sub_status: 'completed' });
      expect(entity.isCompleted()).toBe(true);
    });

    it('isPublic() should return false when visibility is private', () => {
      const entity = new FileMetadataEntity();
      expect(entity.isPublic()).toBe(false);
    });

    it('isPublic() should return true when visibility is public', () => {
      const entity = new FileMetadataEntity({ visibility: 'public' });
      expect(entity.isPublic()).toBe(true);
    });
  });

  describe('validation', () => {
    it('should be valid with all required fields', () => {
      const entity = new FileMetadataEntity({
        tenant_id: 't-1',
        storage_backend_id: 'sb-1',
        record_status: 'upload',
        visibility: 'private'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new FileMetadataEntity({
        storage_backend_id: 'sb-1',
        record_status: 'upload',
        visibility: 'private'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when storage_backend_id is missing', () => {
      const entity = new FileMetadataEntity({
        tenant_id: 't-1',
        record_status: 'upload',
        visibility: 'private'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when record_status is invalid', () => {
      const entity = new FileMetadataEntity({
        tenant_id: 't-1',
        storage_backend_id: 'sb-1',
        record_status: 'bogus',
        visibility: 'private'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when visibility is invalid', () => {
      const entity = new FileMetadataEntity({
        tenant_id: 't-1',
        storage_backend_id: 'sb-1',
        record_status: 'upload',
        visibility: 'hidden'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with no data', () => {
      const entity = new FileMetadataEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FileMetadataEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
