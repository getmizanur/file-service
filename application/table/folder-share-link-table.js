// application/table/folder-share-link-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const FolderShareLinkEntity = require('../entity/folder-share-link-entity');
const FolderShareLinkDTO = require('../dto/folder-share-link-dto');

class FolderShareLinkTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'folder_share_link',
      adapter,
      primaryKey: 'share_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new FolderShareLinkEntity()
    });
  }

  baseColumns() {
    return FolderShareLinkEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  _normalizeRows(result) {
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }

  _hydrateToDtoArray(rows, dtoPrototype) {
    return new HydratingResultSet(this.hydrator, dtoPrototype)
      .initialize(rows)
      .toArray();
  }

  // ------------------------------------------------------------
  // Entity methods
  // ------------------------------------------------------------

  async fetchById(shareId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, shareId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FolderShareLinkEntity(rows[0]) : null;
  }

  async fetchByToken(tokenHash) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('token_hash = ?', tokenHash)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new FolderShareLinkEntity(rows[0]) : null;
  }

  async fetchByFolderId(tenantId, folderId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('tenant_id = ?', tenantId)
      .where('folder_id = ?', folderId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new FolderShareLinkEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch share links for a folder with folder name and creator display name.
   * Returns FolderShareLinkDTO[]
   */
  async fetchByFolderWithDetails(tenantId, folderId) {
    const query = await this.getSelectQuery();

    query
      .from({ fsl: 'folder_share_link' }, [])
      .columns({
        share_id: 'fsl.share_id',
        tenant_id: 'fsl.tenant_id',
        folder_id: 'fsl.folder_id',
        token_hash: 'fsl.token_hash',
        expires_dt: 'fsl.expires_dt',
        password_hash: 'fsl.password_hash',
        created_by: 'fsl.created_by',
        created_dt: 'fsl.created_dt',
        revoked_dt: 'fsl.revoked_dt',

        folder_name: 'f.name',
        creator_display_name: 'u.display_name'
      })
      .join({ f: 'folder' }, 'f.folder_id = fsl.folder_id')
      .joinLeft({ u: 'app_user' }, 'u.user_id = fsl.created_by')
      .where('fsl.tenant_id = ?', tenantId)
      .where('fsl.folder_id = ?', folderId)
      .order('fsl.created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new FolderShareLinkDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insertLink(tenantId, folderId, tokenHash, { expiresDt = null, passwordHash = null, createdBy = null } = {}) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        tenant_id: tenantId,
        folder_id: folderId,
        token_hash: tokenHash,
        expires_dt: expiresDt,
        password_hash: passwordHash,
        created_by: createdBy,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new FolderShareLinkEntity(result.insertedRecord);
  }

  async revokeLink(tenantId, shareId) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ revoked_dt: new Date() })
      .where('tenant_id = ?', tenantId)
      .where('share_id = ?', shareId);

    return update.execute();
  }

  async deleteLink(tenantId, shareId) {
    return this.delete({ tenant_id: tenantId, share_id: shareId });
  }
}

module.exports = FolderShareLinkTable;
