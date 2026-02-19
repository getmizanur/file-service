class StorageBackendListItemDTO {
  setStorageBackendId(v) { this.storage_backend_id = v; }
  setTenantId(v) { this.tenant_id = v; }               // include if column exists
  setName(v) { this.name = v; }
  setProvider(v) { this.provider = v; }
  setDelivery(v) { this.delivery = v; }
  setIsEnabled(v) { this.is_enabled = v; }
  setIsDefaultWrite(v) { this.is_default_write = v; }  // include if column exists
  setConfig(v) { this.config = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
}

module.exports = StorageBackendListItemDTO;