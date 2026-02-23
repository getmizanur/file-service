// application/table/share-link-table.js
const TableGateway = require('../../library/db/table-gateway');
const ShareLinkEntity = require('../entity/share-link-entity');

const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));

const ShareLinkDTO = require(global.applicationPath('/application/dto/share-link-dto'));

class ShareLinkTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'share_link',
      adapter,
      hydrator: hydrator || new ClassMethodsHydrator(),
      primaryKey: 'share_id',
      entityFactory: row => new ShareLinkEntity(row)
    });
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  baseColumns() {
    return ShareLinkEntity.columns();
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
  // Entity reads (recommended for most internal usage)
  // ------------------------------------------------------------

  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from({ sl: this.table }, [])
      .columns(this.baseColumns())
      .where('sl.share_id = ?', id)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new ShareLinkEntity(rows[0]) : null;
  }

  async fetchByToken(tokenHash) {
    const query = await this.getSelectQuery();
    query.from({ sl: this.table }, [])
      .columns(this.baseColumns())
      .where('sl.token_hash = ?', tokenHash)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new ShareLinkEntity(rows[0]) : null;
  }

  async fetchByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from({ sl: this.table }, [])
      .columns(this.baseColumns())
      .where('sl.file_id = ?', fileId)
      .order('sl.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new ShareLinkEntity(r));
  }

  async fetchActiveByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from({ sl: this.table }, [])
      .columns(this.baseColumns())
      .where('sl.file_id = ?', fileId)
      .where('sl.revoked_dt IS NULL')
      .where('(sl.expires_dt IS NULL OR sl.expires_dt > NOW())')
      .order('sl.created_dt', 'DESC')
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);
    return rows.length ? new ShareLinkEntity(rows[0]) : null;
  }

  // ------------------------------------------------------------
  // DTO reads (useful for API responses / projections)
  // ------------------------------------------------------------

  async fetchDtoByToken(tokenHash) {
    const query = await this.getSelectQuery();
    query.from({ sl: this.table }, [])
      .columns(this.baseColumns())
      .where('sl.token_hash = ?', tokenHash)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);
    if (!rows.length) return null;

    return new HydratingResultSet(this.hydrator, new ShareLinkDTO())
      .initialize([rows[0]])
      .current();
  }

  async fetchDtosByFileId(fileId) {
    const query = await this.getSelectQuery();
    query.from({ sl: this.table }, [])
      .columns(this.baseColumns())
      .where('sl.file_id = ?', fileId)
      .order('sl.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new ShareLinkDTO());
  }

  // ------------------------------------------------------------
  // Writes
  // ------------------------------------------------------------

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
    // keep existing behavior
    return this.insert(data);
  }
}

module.exports = ShareLinkTable;