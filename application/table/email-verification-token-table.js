// application/table/email-verification-token-table.js
const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const EmailVerificationTokenEntity = require('../entity/email-verification-token-entity');
const EmailVerificationTokenDTO = require('../dto/email-verification-token-dto');

class EmailVerificationTokenTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'email_verification_token',
      adapter,
      primaryKey: 'token_id',
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new EmailVerificationTokenEntity()
    });
  }

  baseColumns() {
    return EmailVerificationTokenEntity.columns();
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

  async fetchById(tokenId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, tokenId)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new EmailVerificationTokenEntity(rows[0]) : null;
  }

  async fetchByTokenHash(tokenHash) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('token_hash = ?', tokenHash)
      .limit(1);

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.length ? new EmailVerificationTokenEntity(rows[0]) : null;
  }

  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId)
      .order('created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new EmailVerificationTokenEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all tokens for a user with user details.
   * Returns EmailVerificationTokenDTO[]
   * Note: token_hash is excluded from projection.
   */
  async fetchByUserWithDetails(userId) {
    const query = await this.getSelectQuery();

    query
      .from({ t: 'email_verification_token' }, [])
      .columns({
        token_id: 't.token_id',
        user_id: 't.user_id',
        expires_dt: 't.expires_dt',
        used_dt: 't.used_dt',
        created_dt: 't.created_dt',

        user_email: 'u.email',
        user_display_name: 'u.display_name'
      })
      .joinLeft({ u: 'app_user' }, 'u.user_id = t.user_id')
      .where('t.user_id = ?', userId)
      .order('t.created_dt', 'DESC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new EmailVerificationTokenDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async insertToken(userId, tokenHash, expiresDt) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        user_id: userId,
        token_hash: tokenHash,
        expires_dt: expiresDt,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new EmailVerificationTokenEntity(result.insertedRecord);
  }

  async markUsed(tokenId) {
    const Update = require(global.applicationPath('/library/db/sql/update'));

    const update = new Update(this.adapter)
      .table(this.table)
      .set({ used_dt: new Date() })
      .where(`${this.primaryKey} = ?`, tokenId);

    return update.execute();
  }
}

module.exports = EmailVerificationTokenTable;
