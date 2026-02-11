const TableGateway = require('../../library/db/table-gateway');
const PlanEntity = require('../entity/plan-entity');
class PlanTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'plan',
      adapter,
      primaryKey: 'plan_id',
      entityFactory: row => new PlanEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return PlanEntity.columns();
  }
  async fetchById(id) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where(`${this.primaryKey} = ?`, id)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchByCode(code) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('code = ?', code)
      .limit(1);
    const result = await query.execute();
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async fetchAll() {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .order('monthly_price_pence', 'ASC');
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = PlanTable;
