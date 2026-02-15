const TableGateway = require('../../library/db/table-gateway');
const ShareLinkEntity = require('../entity/share-link-entity');
class ShareLinkTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'share_link',
      adapter,
      primaryKey: 'share_id',
      entityFactory: row => new ShareLinkEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return ShareLinkEntity.columns();
  }
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);
    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.length > 0 ? rows[0] : null;
  }
  async fetchByToken(tokenHash) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('token_hash = ?', tokenHash)
      .limit(1);
    const result = await query.execute();
    const rows = (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
    return rows.length > 0 ? rows[0] : null;
  }
  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('file_id = ?', fileId)
      .order('created_dt', 'DESC');
    const result = await query.execute();
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }
  async revoke(tenantId, fileId) {
    const Update = require('../../library/db/sql/update');
    const query = new Update(this.adapter);
    query.table(this.table)
      .set({ revoked_dt: new Date() })
      .where('tenant_id = ?', tenantId)
      .where('file_id = ?', fileId)
      .where('revoked_dt IS NULL');
    return query.execute();
  }

  async create(data) {
    return this.insert(data);
  }
}
module.exports = ShareLinkTable;
